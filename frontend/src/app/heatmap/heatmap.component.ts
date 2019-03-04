import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import * as _ from 'lodash';
import * as jquery from 'jquery';
import * as L from 'leaflet';
import 'leaflet.heat'
import { IPData } from '../ipdata';

@Component({
  selector: 'app-heatmap',
  templateUrl: './heatmap.component.html',
  styleUrls: ['./heatmap.component.scss']
})
export class HeatmapComponent implements OnInit {
  private heatmap;
  private map;
  private pageSize : number = 100;
  private pageCount;
  private currentPage = 1;
  private maxPages = 10; //limit for performance
  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.map = L.map('mapid').setView([35.9405571,-78.9735071], 10);

    
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(this.map);
    
    this.heatmap = L.heatLayer([
      [24, 118, 0.2], // lat, lng, intensity
      [50.6, 30.4, 0.5],
    ], {radius: 30}).addTo(this.map);

    this.map.on('move', e => {
      console.log(e);
    })
    var that = this;
    const req = this.getIPCount();
    req.subscribe(count => {
      this.pageCount = Math.ceil(parseInt(count.toString())/this.pageSize);
      console.log(this.pageCount);
      getNextPage([]);
    })

    function getNextPage(ips: IPData[]) {
      _.forEach(ips, ip => that.heatmap.addLatLng(L.latLng(ip.latitude, ip.longitude, 50)))
      if (that.currentPage < that.pageCount && that.currentPage < that.maxPages) {
        that.getIPData(that.currentPage++).subscribe(getNextPage);
      }
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

  

  getIPCount() {
    return this.http.get('http://localhost:5000/ip/count')
      .pipe(
        catchError(this.handleError)
      );
  }

  getIPData(page): Observable<IPData[]> {
    const params = new HttpParams();
    params.set('page', page);
    params.set('size', this.pageSize.toString());
    const options = { params }

    return this.http.get<IPData[]>('http://localhost:5000/ip', options)
      .pipe(
        catchError(this.handleError)
      );
  }

}
