// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { provideHttpClient } from '@angular/common/http';
import { getTestBed, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true }},
);

Chart.register(...registerables);

beforeEach(() => {
  if (!sessionStorage.getItem('PageNumber')) {
    sessionStorage.setItem('PageNumber', '1');
  }
  if (sessionStorage.getItem('Page1') === null) {
    sessionStorage.setItem('Page1', '');
  }
  if (sessionStorage.getItem('Page2') === null) {
    sessionStorage.setItem('Page2', '');
  }
  if (sessionStorage.getItem('Page3') === null) {
    sessionStorage.setItem('Page3', '');
  }

  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideRouter([])],
  });
});
