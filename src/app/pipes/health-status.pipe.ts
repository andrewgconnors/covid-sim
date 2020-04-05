import { Pipe, PipeTransform } from '@angular/core';
import { HEALTH_STATUSES } from '../models/constants';

@Pipe({
  name: 'healthStatus'
})
export class HealthStatusPipe implements PipeTransform {

  transform(value: number, ...args: unknown[]): string {
    return HEALTH_STATUSES[value];
  }

}
