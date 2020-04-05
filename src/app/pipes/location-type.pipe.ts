import { Pipe, PipeTransform } from '@angular/core';
import { LOCATION_TYPES } from '../models/constants';

@Pipe({
  name: 'locationType'
})
export class LocationTypePipe implements PipeTransform {

  transform(value: number, ...args: unknown[]): string {
    return LOCATION_TYPES[value];
  }

}
