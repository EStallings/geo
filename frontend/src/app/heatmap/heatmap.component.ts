import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import * as _ from 'lodash';
import * as jquery from 'jquery';
import * as L from 'leaflet';
import 'leaflet.heat'
import { IPData } from '../ipdata';

const API_ROOT = 'http://localhost:5000/';

@Component({
  selector: 'app-heatmap',
  templateUrl: './heatmap.component.html',
  styleUrls: ['./heatmap.component.scss']
})
export class HeatmapComponent implements OnInit {
  private PAGE_SIZE : number = 100;
  private MAX_PAGES = 10; //limit for performance

  private heatmap;
  private map;

  private pageCount;
  private currentPage = 1;

  private reset : boolean;
  private currentBounds : L.LatLngBounds;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Create the map
    this.map = L.map('mapid').setView([35.9405571,-98.9735071], 5);

    // Draw the map
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(this.map);
    
    // Create the heatmap
    this.heatmap = L.heatLayer([], {radius: 30}).addTo(this.map);

    // Start initial data loading
    this.initialize();
    
    // Register an onmove event handler to kick off a new chain if we move the map by a certain amount
    this.map.on('move', e => this.monitorBounds());
  }

  private initialize() {
    console.log('initializing');
    this.currentBounds = this.map.getBounds();
    this.currentBounds.pad(2);
    this.currentPage = 1;
    this.reset = true;

    const req = this.getIPCount(this.currentBounds);
    req.subscribe(count => {
      this.pageCount = Math.ceil(parseInt(count.toString())/this.PAGE_SIZE);
      console.log(this.pageCount);
    })
    this.getNextPage([]);
  }

  private getNextPage(ips: IPData[]) {
    if(this.reset && ips.length) {
      this.heatmap.setLatLngs(_.map(ips, ip => L.latLng(ip.latitude, ip.longitude, 50)));
      this.reset = false;
    } else {
      _.forEach(ips, ip => this.heatmap.addLatLng(L.latLng(ip.latitude, ip.longitude, 50)));
    }
    if (this.currentPage < this.pageCount && this.currentPage < this.MAX_PAGES) {
      var bounds : L.LatLngBounds = this.map.getBounds();
      this.getIPDataPositional(bounds, this.currentPage++,).subscribe(x => this.getNextPage(x));
    }
  }

  private monitorBounds() {
    if(!this.currentBounds.overlaps(this.map.getBounds())) {
      this.initialize();
    }
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // return an observable with a user-facing error message
    return throwError(
      'Something bad happened; please try again later.');
  };

  getIPCount(bounds: L.LatLngBounds) {
    console.log(bounds);
    const options = { params: new HttpParams()
      .set('min_lat', bounds.getSouth().toString())
      .set('max_lat', bounds.getNorth().toString())
      .set('min_lon', bounds.getWest().toString())
      .set('max_lon', bounds.getEast().toString())
    }
    return this.http.get(API_ROOT + 'ip/spatial/count', options)
      .pipe(
        catchError(this.handleError)
      );
  }

  getIPDataPositional(bounds: L.LatLngBounds, page): Observable<IPData[]> {
    const options = { params: new HttpParams()
      .set('page', page)
      .set('size', this.PAGE_SIZE.toString())
      .set('min_lat', bounds.getSouth().toString())
      .set('max_lat', bounds.getNorth().toString())
      .set('min_lon', bounds.getWest().toString())
      .set('max_lon', bounds.getEast().toString())
    }

    return this.http.get<IPData[]>(API_ROOT + 'ip/spatial', options)
      .pipe(
        catchError(this.handleError)
      );
  }

}
