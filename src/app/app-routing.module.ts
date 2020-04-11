import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SimComponent } from './sim/sim.component';
import { TestPixiComponent } from './test-pixi/test-pixi.component';

const routes: Routes = [
  { path: 'sim', component: SimComponent },
  { path: 'test-pixi', component: TestPixiComponent },
  { path: '', redirectTo: '/sim', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
