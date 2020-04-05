import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { fabric } from 'fabric';

import { Community } from '../models/community.model';
import { getRandomInt } from '../utility-functions';

@Component({
  selector: 'app-test-sim',
  templateUrl: './test-sim.component.html',
  styleUrls: ['./test-sim.component.scss']
})
export class TestSimComponent implements OnInit {

  @ViewChild('viz', { static: true })
  canvas: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;

  fCanvas: any;

  // Images
  homeImg = new Image();
  workImg = new Image();
  schoolImg = new Image();
  storeImg = new Image();
  imgW = 24;
  imgH = 24;

  numPeople: number = 200;
  comm: Community;

  // Locations scaled to the canvas size. Each index contains the coords for the location with that ID
  scaledHomeLocs: Array<[number, number]>;
  scaledSchoolLocs: Array<[number, number]>;
  scaledWorkLocs: Array<[number, number]>;
  scaledStoreLocs: Array<[number, number]>;

  constructor() {
    
  }

  ngOnInit(): void {
    this.comm = new Community(this.numPeople,
      [.1, .1, .1, .1, .1, .1, .1, .1, .1],
      [.2, .2, .2, .2, .05, .05, .05, .05],
      [.1, .1, .1, .1, .1, .1, .1, .1, .1, .1, 0, 0, 0],
      [.1, .1, .1, .1, .1, .1, .1, .1, .1, .1, 0],
      .05,
      [0, 2],
      [0, 5],
      [0, 14],
      .1,
      1,
      "random",
      []);
  }

  drawLocations(): void {
    console.log(this.comm.homes.length);
    console.log(this.comm.schools.length);
    console.log(this.comm.workplaces.length);
    this.scaledHomeLocs.forEach(h => {
      this.ctx.drawImage(this.homeImg, h[0], h[1]);
    }, this);
    this.scaledWorkLocs.forEach(wp => {
      this.ctx.drawImage(this.workImg, wp[0], wp[1]);
    }, this);
    this.scaledSchoolLocs.forEach(s => {
      this.ctx.drawImage(this.schoolImg, s[0], s[1]);
    }, this);
  }

  resizeCanvas(): void {
    this.canvasWidth = this.canvas.nativeElement.parentElement.clientWidth;
    this.canvasHeight = Math.round(.9*window.innerHeight);
    this.canvas.nativeElement.width = this.canvasWidth;
    this.canvas.nativeElement.height = this.canvasHeight;

    this.scaledHomeLocs = [];
    this.scaledSchoolLocs = [];
    this.scaledWorkLocs = [];
    this.scaledStoreLocs = [];

    // Add a margin of 24 since it is the width/height of the images around the edges
    let origDim = Math.ceil(Math.sqrt(this.comm.people.length));
    let xScale = (this.canvasWidth - 2*this.imgW) / origDim;
    let yScale = (this.canvasHeight - 2*this.imgH) / origDim;

    for (let h of this.comm.homes)
      this.scaledHomeLocs[h.id] = [24 + xScale*h.coordinates[0], 24 + yScale*h.coordinates[1]];
    for (let wp of this.comm.workplaces)
      this.scaledWorkLocs[wp.id] = [24 + xScale*wp.coordinates[0], 24 + yScale*wp.coordinates[1]];
    for (let s of this.comm.schools)
      this.scaledSchoolLocs[s.id] = [24 + xScale*s.coordinates[0], 24 + yScale*s.coordinates[1]];
  }

  ngAfterViewInit(): void {
    this.resizeCanvas();
    this.fCanvas = new fabric.Canvas('viz');
    this.fCanvas.add(new fabric.Text('Hello World !\nTest'));
    this.ctx = this.canvas.nativeElement.getContext('2d');

    let imgsLoaded = 0;

    function imgLoaded() {
      ++imgsLoaded;
      if (imgsLoaded >= 3)
        this.drawLocations.call(this);
    }

    this.homeImg.src = 'assets/home.png';
    this.workImg.src = 'assets/work.png';
    this.schoolImg.src = 'assets/school.png';

    this.homeImg.onload = imgLoaded.bind(this);
    this.workImg.onload = imgLoaded.bind(this);
    this.schoolImg.onload = imgLoaded.bind(this);
  }

}
