import type { NextFunction, Request, Response } from 'express';
import { isRole } from '../src/lib/authorization';
import type { Role } from '../src/types';

export interface VerifiedUser { uid: string; role?: unknown }
export function requireFirebaseRole(verify: (token: string) => Promise<VerifiedUser>, roles: readonly Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
    if (!match) { res.status(401).json({ error: 'Silakan masuk dengan akun Firebase.' }); return; }
    let user: VerifiedUser;
    try { user = await verify(match[1]); }
    catch { res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' }); return; }
    if (!user.uid || !isRole(user.role) || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki izin untuk fitur ini.' }); return;
    }
    res.locals.user = user;
    next();
  };
}
