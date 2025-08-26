import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-super-secret-key'),
    });
  }

  async validate(payload: JwtPayload) {
    // Verificar se o payload contém UUID (tokens antigos)
    if (typeof payload.sub === 'string' && payload.sub.includes('-')) {
      throw new UnauthorizedException('Token expirado - faça login novamente');
    }

    // Garantir que sub seja number
    const userId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
    
    if (isNaN(userId)) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('Token inválido');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
