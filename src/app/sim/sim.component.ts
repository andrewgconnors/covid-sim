import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';

import * as PIXI from 'pixi.js';
var loader = PIXI.Loader.shared;
import { Viewport } from 'pixi-viewport';

import { ADULT_IMGS, KID_IMGS, LOC_IMGS } from '../models/constants';
import { Community } from '../models/community.model';
import { getRandomInt } from '../utility-functions';
import { velocity } from '../pixi-helpers';
import { ageLabels, homeSizeLabels, workSizeLabels, schoolSizeLabels, initialDispersionTypes } from './labels';

@Component({
  selector: 'app-sim',
  templateUrl: './sim.component.html',
  styleUrls: ['./sim.component.scss']
})
export class SimComponent implements OnInit {

  @ViewChild('pixiContainer', { static: true })
  pixiContainer;
  pix: PIXI.Application;
  vp: Viewport;
  pixiWidth: number;
  pixiHeight: number;
  commWidth: number;
  commHeight: number;
  imgW = 24;
  imgH = 24;

  // Play/pause speed of simulation
  fps: number = 60;
  playSpeed: number = 0;
  // Number of frames in a day
  dayLength: number = 0;
  displayType: string = "viz";
  animState: string = 'stop';
  midAnim: boolean = false;

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
  
  homeImgs: Array<PIXI.Sprite> = [];
  schoolImgs: Array<PIXI.Sprite> = [];
  workImgs: Array<PIXI.Sprite> = [];
  storeImgs: Array<PIXI.Sprite> = [];
  personImgs: Array<PIXI.Sprite> = [];
  countTexts: Array<PIXI.Text> = [];

  // Variables that are only necessary for the UI 
  // (e.g., sums of distributions so that they won't be recalculated)
  ageDistSum: string = this.ageDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  homeSizeDistSum: string = this.homeSizeDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  workplaceSizeDistSum: string = this.workplaceSizeDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);
  schoolSizeDistSum: string = this.schoolSizeDist.reduce((acc, cur) => acc + cur, 0).toFixed(3);

  // Attach labels to component
  ageLabels = ageLabels;
  homeSizeLabels = homeSizeLabels;
  workSizeLabels = workSizeLabels;
  schoolSizeLabels = schoolSizeLabels;
  initialDispersionTypes = initialDispersionTypes;

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

  noisyCanvasLocation(x: number, y: number, xSpread: number = .5, ySpread: number = .5): [number, number] {
    return [
      x + getRandomInt(-1*xSpread*this.imgW, xSpread*this.imgW),
      y + getRandomInt(-1*ySpread*this.imgH, ySpread*this.imgH)
    ];
  }

  addPeople(): void {
    this.comm.people.forEach(p => {
      let imgName = p.age <= 18 ? KID_IMGS[p.healthStatus] : ADULT_IMGS[p.healthStatus];
      let sprite = new PIXI.Sprite(loader.resources[imgName].texture);
      let homeLoc = this.noisyCanvasLocation(...this.scaledHomeLocs[p.homeId]);
      sprite.x = homeLoc[0];
      sprite.y = homeLoc[1];
      sprite['vx'] = 0;
      sprite['vy'] = 0;
      this.vp.addChild(sprite);
      this.personImgs[p.id] = sprite;
    }, this);
  }

  addLocations(): void {
    this.scaledHomeLocs.forEach((h, i) => {
      let sprite = new PIXI.Sprite(loader.resources[LOC_IMGS[0]].texture);
      sprite.x = h[0];
      sprite.y = h[1];
      this.vp.addChild(sprite);
      this.homeImgs[i] = sprite;
    }, this);
    this.scaledWorkLocs.forEach((wp, i) => {
      let sprite = new PIXI.Sprite(loader.resources[LOC_IMGS[1]].texture);
      sprite.x = wp[0];
      sprite.y = wp[1];
      this.vp.addChild(sprite);
      this.workImgs[i] = sprite;
    }, this);
    this.scaledSchoolLocs.forEach((sch, i) => {
      let sprite = new PIXI.Sprite(loader.resources[LOC_IMGS[2]].texture);
      sprite.x = sch[0];
      sprite.y = sch[1];
      this.vp.addChild(sprite);
      this.schoolImgs[i] = sprite;
    }, this);
  }

  /**
   * Resizes the canvas to fit the screen. Also calculates and caches the
   * coordinates of each location scaled according to the canvas size.
   */
  resizeCanvas(): void {
    this.pixiWidth = this.pixiContainer.nativeElement.clientWidth;
    this.pixiHeight = this.pixiContainer.nativeElement.clientHeight;
    this.pixiContainer.nativeElement.width = this.pixiWidth;
    this.pixiContainer.nativeElement.height = this.pixiHeight;

    // Calculate the original side length of the community - this mirrors community.model.ts
    let origDim = Math.ceil(Math.sqrt(this.comm.people.length));
    this.commWidth = 1.5*this.imgW*origDim + 2*this.imgW;
    this.commHeight = 1.5*this.imgH*origDim + 2*this.imgH;

    for (let h of this.comm.homes)
      this.scaledHomeLocs[h.id] = [this.imgW + 1.5*this.imgW*h.coordinates[0], this.imgH + 1.5*this.imgH*h.coordinates[1]];
    for (let wp of this.comm.workplaces)
      this.scaledWorkLocs[wp.id] = [this.imgW + 1.5*this.imgW*wp.coordinates[0], this.imgH + 1.5*this.imgH*wp.coordinates[1]];
    for (let s of this.comm.schools)
      this.scaledSchoolLocs[s.id] = [this.imgW + 1.5*this.imgW*s.coordinates[0], this.imgH + 1.5*this.imgH*s.coordinates[1]];
  }

  initializePixi(): void {
    // this.resizeCanvas();
    this.pix = new PIXI.Application({ width: this.pixiWidth, height: this.pixiHeight, antialias: true });
    this.pixiContainer.nativeElement.appendChild(this.pix.view);
    this.vp = new Viewport({
      screenWidth: this.pixiWidth,
      screenHeight: this.pixiHeight,
      worldWidth: this.commWidth,
      worldHeight: this.commHeight,
      interaction: this.pix.renderer.plugins.interaction
    })
    this.pix.stage.addChild(this.vp);
    this.vp
      .drag()
      .pinch()
      .wheel()
      .decelerate();

    this.pix.renderer.backgroundColor = 0xFFFFFF;
    loader.add([
      "assets/adult-healthy.svg",
      "assets/adult-incubating.svg",
      "assets/adult-infectious.svg",
      "assets/adult-recovered.svg",
      "assets/kid-healthy.svg",
      "assets/kid-incubating.svg",
      "assets/kid-infectious.svg",
      "assets/kid-recovered.svg",
      "assets/home.svg",
      "assets/work.svg",
      "assets/school.svg"
    ])
    .load(() => {
      this.addLocations.call(this);
      this.addPeople.call(this);
      this.pix.ticker.maxFPS = this.fps;
      this.pix.ticker.add(delta => this.animLoop.call(this, delta));
    });
    
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event) {
    this.pixiWidth = this.pixiContainer.nativeElement.clientWidth;
    this.pixiHeight = this.pixiContainer.nativeElement.clientHeight;
    this.pix.renderer.resize(this.pixiWidth, this.pixiHeight);
    this.vp.resize(this.pixiWidth, this.pixiHeight);
  }

  ngAfterViewInit(): void {
    this.resizeCanvas();
    this.initializePixi();
    this.resetZoom();
  }

  clearExistingCommunity () {
    // Clear existing locations
    this.scaledHomeLocs = [];
    this.scaledWorkLocs = [];
    this.scaledSchoolLocs = [];
    this.scaledStoreLocs = [];
    while (this.vp.children[0]) this.vp.removeChild(this.vp.children[0]);
  }

  /**
   * Stops simulation, clears the current community, and replaces it with
   * the newly-specified community.
   */
  restartSim(): void {
    this.playSpeed = 0;
    this.clearExistingCommunity();
    this.initializeCommunity();
    this.resizeCanvas();
    this.vp.worldWidth = this.commWidth;
    this.vp.worldHeight = this.commHeight;
    this.addLocations();
    this.addPeople();
    this.resetZoom();
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

  /**
   * Update the visualization state when the display is switched to the
   * visualization pane.
   */
  onDisplayTypeChange(event: any): void {
    if (event.value === 'viz')
      this.updateVisualization();
  }

  onPlaySpeedChange(event: any): void {
    let oldVal = this.playSpeed;
    this.playSpeed = event.value;
    this.dayLength = this.playSpeed*this.fps;
    if (oldVal === 0) {
      // Start community animation
      this.animState = 'move';
      this.commStepTick();
    }
    else if (this.playSpeed === 0) {
      this.animState = 'stop';
    }
  }

  updateVisualization () {
    // TODO: Implement
  }

  animLoop(delta): void {
    if (this.displayType !== 'viz' || this.animState === 'stop') { return; }
    else if (this.animState === 'move') {
      this.personImgs.forEach(sprite => {
        if (sprite['dur'] > 0) {
          let frames = Math.min(delta, sprite['dur']);
          sprite.x += frames*sprite['vx'];
          sprite.y += frames*sprite['vy'];
          sprite['dur'] -= frames;
        }
      });

      let timeMS = 1000*delta/this.fps;
      if (this.countTexts.length > 0) {
        for (let txt of this.countTexts) {
          txt.y += delta*txt['vy'];
          txt['dur'] -= timeMS;
          if (txt['dur'] <= 0) this.vp.removeChild(txt);
        }
        this.countTexts = this.countTexts.filter(txt => txt['dur'] > 0);
      }
    }
  }

  /**
   * Sets paths for people's images. They will move to that destination over
   * the course of duration.
   * duration: `number` number of frames over which the movement should occur.
   */
  setPersonPaths(dests: {[id: number]: [number, number]}, duration: number): void {
    Object.entries(dests).forEach(v => {
      let id = v[0];
      let [destX, destY] = v[1];
      let sprite = this.personImgs[id];
      [sprite['vx'], sprite['vy']] = velocity(sprite.x, sprite.y, destX, destY, duration);
      sprite['dur'] = duration;
      sprite['dest'] = [destX, destY];
    }, this);
  }

  /**
   * Add count text that rises from passed location and disappears after duration.
   * duration: `number` number of ms the count text should be drawn for.
   */
  addCountText(content: string, x: number, y: number, duration: number) {
    let msg = new PIXI.Text(content, { fill: "red", stroke: "white", strokeThickness: 3, fontSize: this.imgH });
    msg.x = x;
    msg.y = y;
    msg['vy'] = -1;
    msg['dur'] = duration;
    this.vp.addChild(msg);
    this.countTexts.push(msg);
  }

  animateToWorkSchool(duration: number, next?: Function, nextDelay?: number) {
    // Guard for paused simulation
    if (this.animState === 'stop') {
      setTimeout(this.animateToWorkSchool.bind(this, ...arguments), 100);
      return;
    }

    let dests = {};
    this.comm.people.forEach(p => {
      if (p.workId !== null)
        dests[p.id] = this.noisyCanvasLocation(...this.scaledWorkLocs[p.workId]);
      else if (p.schoolId !== null)
        dests[p.id] = this.noisyCanvasLocation(...this.scaledSchoolLocs[p.schoolId]);
    }, this);
    this.setPersonPaths(dests, duration);

    if (next) setTimeout(next, nextDelay || 0);
  }

  animateWorkSchoolInfections(workInfections: object, schoolInfections: object, next?: Function, nextDelay?: number) {
    // Guard for paused simulation
    if (this.animState === 'stop') {
      setTimeout(this.animateWorkSchoolInfections.bind(this, ...arguments), 100);
      return;
    }
    
    // Draw +n at each location
    let workCounts = {};
    let schoolCounts = {};

    // Process each workplace
    for (let singleWorkInfs of Object.entries(workInfections)) {
      let [workId, infectedPeople] = singleWorkInfs;
      workCounts[workId] = infectedPeople.length;
      infectedPeople.forEach(pId => {
        let p = this.comm.people[pId];
        let imgName = p.age <= 18 ? KID_IMGS[p.healthStatus] : ADULT_IMGS[p.healthStatus];
        this.personImgs[pId].texture = loader.resources[imgName].texture;
      }, this);
    }

    // Process each school
    for (let singleSchoolInfs of Object.entries(schoolInfections)) {
      let [schoolId, infectedPeople] = singleSchoolInfs;
      schoolCounts[schoolId] = infectedPeople.length;
      infectedPeople.forEach(pId => {
        let p = this.comm.people[pId];
        let imgName = p.age <= 18 ? KID_IMGS[p.healthStatus] : ADULT_IMGS[p.healthStatus];
        this.personImgs[pId].texture = loader.resources[imgName].texture;
      }, this);
    }

    Object.entries(workCounts).forEach(ent => {
      let [workId, count] = ent;
      this.addCountText('+' + count.toString(), this.scaledWorkLocs[workId][0], this.scaledWorkLocs[workId][1], 1000);
    }, this);

    Object.entries(schoolCounts).forEach(ent => {
      let [schoolId, count] = ent;
      this.addCountText('+' + count.toString(), this.scaledSchoolLocs[schoolId][0], this.scaledSchoolLocs[schoolId][1], 1000);
    }, this);

    if (next) setTimeout(next, nextDelay || 0);
  }

  animateToHome(duration: number, next?: Function, nextDelay?: number) {
    // Guard for paused simulation
    if (this.animState === 'stop') {
      setTimeout(this.animateToHome.bind(this, ...arguments), 100);
      return;
    }

    let dests = {};
    this.comm.people.forEach(p => {
      if (p.workId !== null || p.schoolId !== null)
        dests[p.id] = this.noisyCanvasLocation(...this.scaledHomeLocs[p.homeId]);
    }, this);
    this.setPersonPaths(dests, duration);

    if (next) setTimeout(next, nextDelay || 0);
  }

  animateHomeInfections(homeInfections: object, next?: Function, nextDelay?: number) {
    // Guard for paused simulation
    if (this.animState === 'stop') {
      setTimeout(this.animateHomeInfections.bind(this, ...arguments), 100);
      return;
    }
    
    // Draw +n at each home
    let homeCounts = {};

    // Process each home
    for (let singleHomeInfs of Object.entries(homeInfections)) {
      let [homeId, infectedPeople] = singleHomeInfs;
      homeCounts[homeId] = infectedPeople.length;
      infectedPeople.forEach(pId => {
        let p = this.comm.people[pId];
        let imgName = p.age <= 18 ? KID_IMGS[p.healthStatus] : ADULT_IMGS[p.healthStatus];
        this.personImgs[pId].texture = loader.resources[imgName].texture;
      }, this);
    }

    Object.entries(homeCounts).forEach(ent => {
      let [homeId, count] = ent;
      this.addCountText('+' + count.toString(), this.scaledHomeLocs[homeId][0], this.scaledHomeLocs[homeId][1], 1000);
    }, this);

    if (next) setTimeout(next, nextDelay || 0);
  }

  animateWorkSchool(workInfections: object, schoolInfections: object, workFrames: number, next?: Function) {
    // Guard for paused simulation
    if (this.animState === 'stop') {
      setTimeout(this.animateWorkSchool.bind(this, ...arguments), 100);
      return;
    }
    
    var f2 = this.animateWorkSchoolInfections.bind(this, workInfections, schoolInfections, next, 550*workFrames/this.fps);
    var f2Delay = 450*workFrames/this.fps;
    var f1 = this.animateToWorkSchool.bind(this, .4*workFrames, f2, f2Delay);

    f1();
  }

  animateFreeTime(freeTimeInfections: object, freeFrames: number, next?: Function) {
    // Guard for paused simulation
    if (this.animState === 'stop') {
      setTimeout(this.animateFreeTime.bind(this, ...arguments), 100);
      return;
    }

    // TODO: fill in, change setTimeout() below if necessary

    if (next) setTimeout(next, 1000*freeFrames/this.fps);
  }

  animateHome(homeInfections: object, homeFrames: number, next?: Function) {
    // Guard for paused simulation
    if (this.animState === 'stop') {
      setTimeout(this.animateHome.bind(this, ...arguments), 100);
      return;
    }

    var f2 = this.animateHomeInfections.bind(this, homeInfections, next, 550*homeFrames/this.fps);
    var f2Delay = 450*homeFrames/this.fps;
    var f1 = this.animateToHome.bind(this, .4*homeFrames, f2, f2Delay);

    f1();
  }

  updatePersonImgs(progressions: number[]) {
    progressions.forEach(pId => {
      let p = this.comm.people[pId];
      if (p.healthStatus === 5) {
        // Dead
        this.vp.removeChild(this.personImgs[pId]);
      }
      else {
        let imgName = p.age <= 18 ? KID_IMGS[p.healthStatus] : ADULT_IMGS[p.healthStatus];
        this.personImgs[pId].texture = loader.resources[imgName].texture;
      }
    }, this);
  }

  animationChain(result: object): void {
    this.midAnim = true;
    let workFrames = this.dayLength*this.comm.numHoursWork/24;
    let freeFrames = this.dayLength*this.comm.numHoursFree/24;
    let homeFrames = this.dayLength*this.comm.numHoursHome/24;

    var end = () => { 
      this.updatePersonImgs(result['progressions']);
      this.midAnim = false;
    }
    var home = this.animateHome.bind(this, result['homeInfections'], homeFrames, end);
    var freeTime = this.animateFreeTime.bind(this, {}, freeFrames, home); // Replace empty object with result['freeTimeInfections']
    var workSchool = this.animateWorkSchool.bind(this, result['workInfections'], result['schoolInfections'], workFrames, freeTime);

    workSchool();
  }

  doCommStep(): void {
    let result = this.comm.step();

    // Update graphs
    // TODO!

    if (this.displayType === 'viz') {
      this.animationChain(result);
    }

    setTimeout(this.commStepTick.bind(this), 1000*this.dayLength/this.fps);
  }

  commStepTick(): void {
    if (this.playSpeed === 0) return;
    else {
      // Check we're not in the middle of an animation
      if (!this.midAnim) {
        // Check if no one is infected, and stop if so
        if ((this.comm.statusCounts[1] + this.comm.statusCounts[2] + this.comm.statusCounts[3]) === 0) {
          this.animState = 'stop';
          setTimeout( () => this.playSpeed = 0, 0);
        }
        else this.doCommStep();
      }
      else
        setTimeout(this.commStepTick.bind(this), 100);
    }
  }

  resetZoom(): void {
    // this.vp.fitWorld();
    this.vp.snap(this.vp.worldWidth / 2, this.vp.worldHeight / 2,
      { removeOnComplete: true, removeOnInterrupt: true });
    let diffY = (this.vp.worldScreenWidth / this.vp.worldScreenHeight)*(this.vp.worldHeight - this.vp.worldScreenHeight);
    let diffX = this.vp.worldWidth - this.vp.worldScreenWidth;
    let diff = Math.max(diffX, diffY);
    this.vp.zoom(diff, true);
    // this.canvas.absolutePan(new fabric.Point(0, 0));
    // this.canvas.setZoom(Math.min(this.canvasWidth / this.totalWidth, this.canvasHeight / this.totalHeight));
    // this.canvas.requestRenderAll();
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
