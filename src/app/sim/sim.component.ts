import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';

import { fabric } from 'fabric';

import { Community } from '../models/community.model';
import { getRandomInt } from '../utility-functions';
import { ageLabels, homeSizeLabels, workSizeLabels, schoolSizeLabels, initialDispersionTypes } from './labels';

@Component({
  selector: 'app-sim',
  templateUrl: './sim.component.html',
  styleUrls: ['./sim.component.scss']
})
export class SimComponent implements OnInit {

  // Canvas (HTML and Fabric)
  @ViewChild('viz', { static: true })
  canvasElem: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasCard', { static: true })
  canvasCardElem: ElementRef<HTMLCanvasElement>;
  canvasWidth: number;
  canvasHeight: number;
  canvas: any;
  imgW = 24;
  imgH = 24;

  // Attach labels to component
  ageLabels = ageLabels;
  homeSizeLabels = homeSizeLabels;
  workSizeLabels = workSizeLabels;
  schoolSizeLabels = schoolSizeLabels;
  initialDispersionTypes = initialDispersionTypes;

  // Play/pause speed of simulation
  playSpeed: number = 0;
  displayType: string = "viz";

  // Community

  comm: Community;

  // Simulation settings with defaults - bound to form
  currentParams: object = {};
  numPeople: number = 200;
  ageDist: number[] = [13.13, 13.84, 13.83, 13.00, 14.12, 13.59, 9.47, 5.38, 3.64]; // https://www.census.gov/prod/cen2010/briefs/c2010br-03.pdf
  homeSizeDist: number[] = [27, 34, 16, 14, 6, 2, 0.5, 0.5]; // https://www.statista.com/statistics/242189/disitribution-of-households-in-the-us-by-household-size/
  workplaceSizeDist: number[] = [8, 8, 8, 10, 11, 10, 9, 8, 7, 6, 5, 5, 5]; // no basis for this
  schoolSizeDist: number[] = [2, 5, 10, 12, 14, 14, 12, 11, 9, 7, 4]; // not much basis for this either
  percentOver65Employed: number = 10;
  initialNumInfected: number = 1;
  initialDispersion: string = initialDispersionTypes[0];

  // Can be changed mid-sim
  pInfect: number = .05;
  fatalityPercent: number[] = [0, 0.2, 0.2, 0.2, 0.4, 1.3, 3.6, 8.0, 14.8]; // https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.businessinsider.com%2Fmost-us-coronavirus-deaths-ages-65-older-cdc-report-2020-3&psig=AOvVaw1Xmr_p7rYoYptaukuL6u4V&ust=1585367581744000&source=images&cd=vfe&ved=0CAIQjRxqFwoTCNC9pu_huegCFQAAAAAdAAAAABAD
  incubationDaysRange: [number, number] = [0, 14];
  asymptomaticDaysRange: [number, number] = [0, 14];
  infectionDaysRange: [number, number] = [7, 28];

  // Cached location coordinates, scaled to the canvas size. Each index corresponds
  // to the location with that ID, and contains the coordinates for that location
  scaledHomeLocs: Array<[number, number]> = []
  scaledSchoolLocs: Array<[number, number]> = [];
  scaledWorkLocs: Array<[number, number]> = [];
  scaledStoreLocs: Array<[number, number]> = [];

  // Images that have been added to the canvas. Each index matches the corresponding
  // ID for the object (location/person).
  homeImgs: Array<fabric.Image> = [];
  schoolImgs: Array<fabric.Image> = [];
  workImgs: Array<fabric.Image> = [];
  storeImgs: Array<fabric.Image> = [];
  personImgs: Array<fabric.Image> = [];

  // Base images to be cloned on the canvas
  numBaseImgs: number = 11;
  baseHome: fabric.Image;
  baseWork: fabric.Image;
  baseSchool: fabric.Image;
  baseStore: fabric.Image; // unused at the moment
  // These two map healthStatus -> a fabric image object for kids and adults
  adultBaseImages: Object = {};
  kidBaseImages: Object = {};

  // Variables that are only necessary for the UI 
  // (e.g., sums of distributions so that they won't be recalculated)
  ageDistSum: string = this.ageDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  homeSizeDistSum: string = this.homeSizeDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  workplaceSizeDistSum: string = this.workplaceSizeDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  schoolSizeDistSum: string = this.schoolSizeDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);

  initializeCommunity(): void {
    this.comm = new Community(this.numPeople,
      this.ageDist.map(p => p/100),
      this.homeSizeDist.map(p => p/100),
      this.workplaceSizeDist.map(p => p/100),
      this.schoolSizeDist.map(p => p/100),
      this.pInfect,
      this.incubationDaysRange,
      this.asymptomaticDaysRange,
      this.infectionDaysRange,
      this.percentOver65Employed/100,
      this.initialNumInfected,
      this.initialDispersion,
      this.fatalityPercent.map(p => p/100));
    this.currentParams['numPeople'] = this.numPeople;
    this.currentParams['ageDist'] = [...this.ageDist];
    this.currentParams['homeSizeDist'] = [...this.homeSizeDist];
    this.currentParams['workplaceSizeDist'] = [...this.workplaceSizeDist];
    this.currentParams['schoolSizeDist'] = [...this.schoolSizeDist];
    this.currentParams['pInfect'] = this.pInfect;
    this.currentParams['incubationDaysRange'] = [...this.incubationDaysRange];
    this.currentParams['asymptomaticDaysRange'] = [...this.asymptomaticDaysRange];
    this.currentParams['infectionDaysRange'] = [...this.infectionDaysRange];
    this.currentParams['percentOver65Employed'] = this.percentOver65Employed;
    this.currentParams['initialNumInfected'] = this.initialNumInfected;
    this.currentParams['initialDispersion'] = this.initialDispersion;
    this.currentParams['fatalityPercent'] = [...this.fatalityPercent];
  }

  constructor() { }

  ngOnInit(): void {
    this.initializeCommunity();
  }

  addLocations(render: boolean = true): void {
    let toAdd: number = this.scaledHomeLocs.length + this.scaledWorkLocs.length + this.scaledSchoolLocs.length;
    let added: number = 0;
    this.scaledHomeLocs.forEach((h, i) => {
      let img = fabric.util.object.clone(this.baseHome);
      img.set({ left: h[0], top: h[1], width: this.imgW, height: this.imgH });
      this.canvas.add(img);
      this.homeImgs[i] = img;
      if (render) {
        ++added;
        if (added >= toAdd) this.canvas.requestRenderAll();
      }
    });
    this.scaledWorkLocs.forEach((wp, i) => {
      let img = fabric.util.object.clone(this.baseWork);
      img.set({ left: wp[0], top: wp[1], width: this.imgW, height: this.imgH });
      this.canvas.add(img);
      this.workImgs[i] = img;
      if (render) {
        ++added;
        if (added >= toAdd) this.canvas.requestRenderAll();
      }
    });
    this.scaledSchoolLocs.forEach((s, i) => {
      let img = fabric.util.object.clone(this.baseSchool);
      img.set({ left: s[0], top: s[1], width: this.imgW, height: this.imgH });
      this.canvas.add(img);
      this.schoolImgs[i] = img;
      if (render) {
        ++added;
        if (added >= toAdd) this.canvas.requestRenderAll();
      }
    });
  }

  addPeople(render: boolean = true): void {
    let toAdd: number = this.comm.people.length;
    let added: number = 0;
    this.comm.people.forEach(p => {
      let img;
      if (p.age <= 18) {
        img = fabric.util.object.clone(this.kidBaseImages[p.healthStatus]);
      }
      else {
        img = fabric.util.object.clone(this.adultBaseImages[p.healthStatus]);
      }
      let homeLoc = this.scaledHomeLocs[p.homeId];
      img.set({ left: homeLoc[0] + getRandomInt(-.5*this.imgW, .5*this.imgW), top: homeLoc[1] + getRandomInt(-.5*this.imgH, .5*this.imgH), width: this.imgW, height: this.imgH })
      this.canvas.add(img);
      this.personImgs[p.id] = img;
      if (render) {
        ++added;
        if (added >= toAdd) this.canvas.requestRenderAll();
      }
    }, this);
  }

  /**
   * Resizes the canvas to fit the screen. Also calculates and caches the
   * coordinates of each location scaled according to the canvas size.
   */
  resizeCanvas(): void {
    this.canvasWidth = this.canvasCardElem.nativeElement.clientWidth;
    this.canvasHeight = this.canvasCardElem.nativeElement.clientHeight;
    this.canvasElem.nativeElement.width = this.canvasWidth;
    this.canvasElem.nativeElement.height = this.canvasHeight;

    // Calculate the original side length of the community - this mirrors community.model.ts
    let origDim = Math.ceil(Math.sqrt(this.comm.people.length));
    // Add a margin of the width/height of the location images around the edges
    let xScale = (this.canvasWidth - 2*this.imgW) / origDim;
    let yScale = (this.canvasHeight - 2*this.imgH) / origDim;

    for (let h of this.comm.homes)
      this.scaledHomeLocs[h.id] = [this.imgW + xScale*h.coordinates[0], this.imgH + yScale*h.coordinates[1]];
    for (let wp of this.comm.workplaces)
      this.scaledWorkLocs[wp.id] = [this.imgW + xScale*wp.coordinates[0], this.imgH + yScale*wp.coordinates[1]];
    for (let s of this.comm.schools)
      this.scaledSchoolLocs[s.id] = [this.imgW + xScale*s.coordinates[0], this.imgH + yScale*s.coordinates[1]];
  }

  initializeFabricCanvas(): void {
    this.canvas = new fabric.Canvas('viz', { selection: false, renderOnAddRemove: false });
    fabric.Object.prototype.selectable = false;
    fabric.Object.prototype.hoverCursor = 'pointer';
    fabric.Object.prototype.objectCaching = false;
    // Add zoom to canvas
    this.canvas.on('mouse:wheel', opt => {
      var delta = opt.e.deltaY;
      var pointer = this.canvas.getPointer(opt.e);
      var zoom = this.canvas.getZoom();
      zoom = zoom + delta/200;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      this.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      this.canvas.requestRenderAll();
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
    // Add pan to canvas
    this.canvas.on('mouse:down', opt => {
      var evt = opt.e;
      this.canvas.isDragging = true;
      this.canvas.lastPosX = evt.clientX;
      this.canvas.lastPosY = evt.clientY;
    });
    this.canvas.on('mouse:move', opt => {
      if (this.canvas.isDragging) {
        var e = opt.e;
        this.canvas.viewportTransform[4] += e.clientX - this.canvas.lastPosX;
        this.canvas.viewportTransform[5] += e.clientY - this.canvas.lastPosY;
        this.canvas.requestRenderAll();
        this.canvas.lastPosX = e.clientX;
        this.canvas.lastPosY = e.clientY;
      }
    });
    this.canvas.on('mouse:up', opt => {
      this.canvas.isDragging = false;
      this.canvas.forEachObject(o => { o.setCoords(); });
    });
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event) {
    this.canvas.clear();
    this.resizeCanvas();
    this.canvas.setWidth(this.canvasWidth);
    this.canvas.setHeight(this.canvasHeight);
    this.addLocations();
    this.addPeople();
  }

  loadBaseImages(callback?: Function) : void {
    let numLoaded = 0;
    fabric.Image.fromURL('assets/home.svg', img => {
      this.baseHome = img;
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/work.svg', img => {
      this.baseWork = img;
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/school.svg', img => {
      this.baseSchool = img;
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/adult-healthy.svg', img => {
      this.adultBaseImages[0] = img;
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/adult-incubating.svg', img => {
      this.adultBaseImages[1] = img;
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/adult-infectious.svg', img => {
      this.adultBaseImages[2] = img;
      this.adultBaseImages[3] = this.adultBaseImages[2];
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/adult-recovered.svg', img => {
      this.adultBaseImages[4] = img;
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/kid-healthy.svg', img => {
      this.kidBaseImages[0] = img;
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/kid-incubating.svg', img => {
      this.kidBaseImages[1] = img;
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/kid-infectious.svg', img => {
      this.kidBaseImages[2] = img;
      this.kidBaseImages[3] = this.kidBaseImages[2];
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
    fabric.Image.fromURL('assets/kid-recovered.svg', img => {
      this.kidBaseImages[4] = img;
      ++numLoaded;
      if (callback && numLoaded >= this.numBaseImgs)
        callback();
    });
  }

  ngAfterViewInit(): void {
    this.resizeCanvas();
    this.initializeFabricCanvas();
    this.loadBaseImages(() => {
      this.addLocations.call(this);
      this.addPeople.call(this);
    });
  }

  clearExistingCommunity () {
    // Clear existing locations
    this.scaledHomeLocs = [];
    this.scaledWorkLocs = [];
    this.scaledSchoolLocs = [];
    this.scaledStoreLocs = [];
  }

  restartSim(): void {
    this.playSpeed = 0;
    this.clearExistingCommunity();
    this.canvas.clear();
    this.initializeCommunity();
    this.resizeCanvas();
    this.addLocations();
    this.addPeople();
  }

  revertSettings(): void {
    this.numPeople = this.currentParams['numPeople'];
    this.ageDist = [...this.currentParams['ageDist']];
    this.homeSizeDist = [...this.currentParams['homeSizeDist']];
    this.workplaceSizeDist = [...this.currentParams['workplaceSizeDist']];
    this.schoolSizeDist = [...this.currentParams['schoolSizeDist']];
    this.pInfect = this.currentParams['pInfect'];
    this.incubationDaysRange = [...this.currentParams['incubationDaysRange']] as [number, number];
    this.asymptomaticDaysRange = [...this.currentParams['asymptomaticDaysRange']] as [number, number];
    this.infectionDaysRange = [...this.currentParams['infectionDaysRange']] as [number, number];
    this.percentOver65Employed = this.currentParams['percentOver65Employed'];
    this.initialNumInfected = this.currentParams['initialNumInfected'];
    this.initialDispersion = this.currentParams['initialDispersion'];
    this.fatalityPercent = [...this.currentParams['fatalityPercent']];

    this.onAgeDistChange();
    this.onHomeDistChange();
    this.onWorkDistChange();
    this.onSchoolDistChange();
  }

  onSimCtrlChange(event: any): void {
    let oldVal = this.playSpeed;
    this.playSpeed = event.value;
    if (oldVal === 0) {
      // Start the ticking
      this.commStepTick();
    }
  }

  doCommStep(): void {
    if (this.playSpeed !== 0)
      this.comm.step();
  }

  commStepTick(): void {
    if (this.playSpeed === 0) return;
    else {
      this.doCommStep();
      setTimeout(this.commStepTick.bind(this), 1000*this.playSpeed);
    }
  }

  // ngModelChange handlers

  onAgeDistChange(event: any = null): void {
    this.ageDistSum = this.ageDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  }

  onHomeDistChange(event: any = null): void {
    this.homeSizeDistSum = this.homeSizeDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  }

  onWorkDistChange(event: any = null): void {
    this.workplaceSizeDistSum = this.workplaceSizeDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  }

  onSchoolDistChange(event: any = null): void {
    this.schoolSizeDistSum = this.schoolSizeDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  }

}
