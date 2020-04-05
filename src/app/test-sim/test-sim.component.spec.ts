import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestSimComponent } from './test-sim.component';

describe('TestSimComponent', () => {
  let component: TestSimComponent;
  let fixture: ComponentFixture<TestSimComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TestSimComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestSimComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
