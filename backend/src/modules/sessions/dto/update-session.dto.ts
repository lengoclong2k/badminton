import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';

export class UpdateSessionDto extends PartialType(
  OmitType(CreateSessionDto, ['openForRsvp'] as const),
) {}
