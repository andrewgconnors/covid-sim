import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TestSimComponent } from './test-sim/test-sim.component';
import { SimComponent } from './sim/sim.component';

const routes: Routes = [
  { path: 'test-sim', component: TestSimComponent },
  { path: 'sim', component: SimComponent },
  { path: '', redirectTo: '/sim', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
