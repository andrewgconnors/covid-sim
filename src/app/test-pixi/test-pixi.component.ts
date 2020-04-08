import { Component, ViewChild, OnInit } from '@angular/core';

// declare var PIXI: any;
import * as PIXI from 'pixi.js';

@Component({
  selector: 'app-test-pixi',
  templateUrl: './test-pixi.component.html',
  styleUrls: ['./test-pixi.component.scss']
})
export class TestPixiComponent implements OnInit {

  @ViewChild('pixiContainer') pixiContainer;
  pApp: any;

  constructor() { }

  ngOnInit(): void {
    
  }

  ngAfterViewInit(): void {
    this.pApp = new PIXI.Application({ width: 800, height: 600 });
    this.pixiContainer.nativeElement.appendChild(this.pApp.view);
  }

}
