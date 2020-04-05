import { HealthStatusPipe } from './health-status.pipe';

describe('HealthStatusPipe', () => {
  it('create an instance', () => {
    const pipe = new HealthStatusPipe();
    expect(pipe).toBeTruthy();
  });
});
