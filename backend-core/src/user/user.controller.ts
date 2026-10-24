import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { Role } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  create(@Body() body: { name: string; email: string; password: string; role: Role; tenantId: string; gabineteId: string }) {
    return this.userService.create(body);
  }

  @Get('gabinete/:gabineteId')
  findByGabinete(@Param('gabineteId') gabineteId: string) {
    return this.userService.findByGabinete(gabineteId);
  }
}