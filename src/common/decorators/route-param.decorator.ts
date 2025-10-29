import { Param } from '@nestjs/common';

export const ParamId = (property = 'id') => Param(property);
