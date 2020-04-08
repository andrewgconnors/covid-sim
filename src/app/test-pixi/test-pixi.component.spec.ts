import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestPixiComponent } from './test-pixi.component';

describe('TestPixiComponent', () => {
  let component: TestPixiComponent;
  let fixture: ComponentFixture<TestPixiComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TestPixiComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestPixiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
