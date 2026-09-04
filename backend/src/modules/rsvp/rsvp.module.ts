import { Module } from '@nestjs/common';
import { RsvpController } from './rsvp.controller';

@Module({ controllers: [RsvpController] })
export class RsvpModule {}
