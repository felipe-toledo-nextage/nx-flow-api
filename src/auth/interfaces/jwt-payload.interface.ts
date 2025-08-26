export interface JwtPayload {
  sub: number | string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}
