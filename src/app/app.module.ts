import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { ChartsModule } from 'ng2-charts';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TestSimComponent } from './test-sim/test-sim.component';
import { HealthStatusPipe } from './pipes/health-status.pipe';
import { LocationTypePipe } from './pipes/location-type.pipe';
import { SimComponent } from './sim/sim.component';

@NgModule({
  declarations: [
    AppComponent,
    TestSimComponent,
    HealthStatusPipe,
    LocationTypePipe,
    SimComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatInputModule,
    BrowserAnimationsModule,
    FormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatSliderModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    ChartsModule,
    MatButtonToggleModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
