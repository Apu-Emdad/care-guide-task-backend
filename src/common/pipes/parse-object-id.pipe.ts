import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

/** Checks that a route param is a MongoDB id. A bad id can't match anything, so it gives 404. */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new NotFoundException('Resource not found');
    }
    return value;
  }
}
