import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import * as _ from 'lodash';
import * as jquery from 'jquery';
import * as L from 'leaflet';
import 'leaflet.heat'
import { IPData } from '../ipdata';

const API_ROOT = '/';

@Component({
  selector: 'app-heatmap',
  templateUrl: './heatmap.component.html',
  styleUrls: ['./heatmap.component.scss']
})
export class HeatmapComponent implements OnInit {
  private PAGE_SIZE : number = 500;

  private heatmap;
  private map;

  pageCount;
  currentPage = 1;
  totalPoints = 0;
  loading = true;

  private shouldLoadMore: boolean;
  private reset : boolean;
  private currentBounds : L.LatLngBounds;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Create the map
    this.map = L.map('mapid').setView([35.9405571,-98.9735071], 5);

    // Create options as an any so typescript doesn't complain
    const options : any = {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1IjoiZXN0YWxsaW5ncyIsImEiOiJjanN1c243MGwyaHp3NDlwZHg4anY0MHI4In0.zPBVv8Xt7nS98kbu21AsoA'
    }
    // Draw the map
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', options).addTo(this.map);
    
    // Create the heatmap
    this.heatmap = L.heatLayer([], {radius: 15}).addTo(this.map);

    // Start initial data loading
    this.initialize();
    
    // Register an onmove event handler to kick off a new chain if we move the map by a certain amount
    this.map.on('moveend', e => this.monitorBounds());
    this.map.on('zoomend', e => this.monitorBounds());
  }

  toggleLoading() {
    this.loading = !this.loading;
    if(this.loading && this.shouldLoadMore) {
      this.shouldLoadMore = false;
      this.getIPDataPositional(this.currentBounds, this.currentPage++).subscribe(x => this.getNextPage(x));
    }
  }

  // Re-initializes the loading process to clear old data and move the current bounds to check
  private initialize() {
    console.log('initializing');
    this.currentBounds = this.map.getBounds().pad(2);
    this.currentPage = 1;
    this.totalPoints = 0;
    this.reset = true;

    this.getIPDataPositional(this.currentBounds, this.currentPage++).subscribe(x => this.getNextPage(x));
  }

  // Constantly get more data, if able
  private getNextPage(ips: IPData[]) {
    // If no more IPs were found, we end
    if(ips.length) {
      this.totalPoints += ips.length;
      // First time, we call set instead of add, because we may have moved (prevent infinite memory leakage!)
      if(this.reset) {
        this.heatmap.setLatLngs(_.map(ips, ip => L.latLng(ip.latitude, ip.longitude, 10)));
        this.reset = false;
      } else {
        _.forEach(ips, ip => this.heatmap.addLatLng(L.latLng(ip.latitude, ip.longitude, 10)));
      }
      if(!this.loading) {
        this.shouldLoadMore = true;
        return;
      }
      // Get next batch
      this.getIPDataPositional(this.currentBounds, this.currentPage++).subscribe(x => this.getNextPage(x));
    }
  }

  // Watches to see if we've left the current boundary we're loading stuff for
  private monitorBounds() {
    if(!this.currentBounds.contains(this.map.getBounds()) || this.currentBounds.contains(this.map.getBounds().pad(4))) {
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
      .set('count', this.PAGE_SIZE.toString())
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
