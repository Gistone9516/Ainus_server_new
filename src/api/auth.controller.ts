import { Request, Response } from 'express';
import {
    register,
    login,
    logout,
    getUserInfo,
    checkEmailAvailability,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyEmail
} from '../services/auth/AuthService';
import { getConfig } from '../config/environment';
import {
    generateGoogleOAuthState,
    validateGoogleOAuthState,
    getGoogleAccessToken,
    getGoogleUserInfo,
    googleLogin
} from '../services/auth/GoogleOAuthService';
import {
    generateKakaoOAuthState,
    validateKakaoOAuthState,
    getKakaoAccessToken,
    getKakaoUserInfo,
    kakaoLogin
} from '../services/auth/KakaoOAuthService';
import {
    generateNaverOAuthState,
    validateNaverOAuthState,
    getNaverAccessToken,
    getNaverUserInfo,
    naverLogin
} from '../services/auth/NaverOAuthService';

export class AuthController {
    // Helper function to extract client IP address
    private static getClientIp(req: Request): string {
        // 프록시를 통한 요청인 경우
        const forwarded = req.get('x-forwarded-for');
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        // 직접 연결
        return (
            req.socket.remoteAddress ||
            req.connection.remoteAddress ||
            req.ip ||
            'unknown'
        );
    }

    static async register(req: Request, res: Response) {
        const { email, password, nickname, terms_agreed, privacy_agreed, marketing_agreed } = req.body;

        const result = await register({
            email,
            password,
            nickname,
            terms_agreed,
            privacy_agreed,
            marketing_agreed
        });

        res.status(201).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    static async checkEmail(req: Request, res: Response) {
        const { email } = req.query;

        if (!email || typeof email !== 'string') {
            throw new Error('email 파라미터가 필요합니다');
        }

        const result = await checkEmailAvailability(email);

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    static async login(req: Request, res: Response) {
        const { email, password, device_type } = req.body;
        const ip_address = AuthController.getClientIp(req);
        const user_agent = req.get('user-agent') || 'unknown';

        const result = await login({
            email,
            password,
            ip_address,
            user_agent,
            device_type
        });

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    static async getMe(req: Request, res: Response) {
        const userId = (req as any).userId;

        const user = await getUserInfo(userId);

        res.status(200).json({
            success: true,
            data: user,
            timestamp: new Date().toISOString()
        });
    }

    static async refresh(req: Request, res: Response) {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            throw new Error('refresh_token이 필요합니다');
        }

        const result = await refreshAccessToken(refresh_token, true);

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    static async logout(req: Request, res: Response) {
        const authHeader = req.get('Authorization');
        const accessToken = authHeader ? authHeader.slice(7) : '';
        const { refresh_token } = req.body;

        await logout(accessToken, refresh_token);

        res.status(200).json({
            success: true,
            message: '로그아웃되었습니다',
            timestamp: new Date().toISOString()
        });
    }

    static async forgotPassword(req: Request, res: Response) {
        const { email } = req.body;

        if (!email) {
            throw new Error('email이 필요합니다');
        }

        const result = await forgotPassword(email);

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    static async resetPassword(req: Request, res: Response) {
        const { token, password } = req.body;

        if (!token) {
            throw new Error('token이 필요합니다');
        }
        if (!password) {
            throw new Error('password가 필요합니다');
        }

        const result = await resetPassword(token, password);

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    static async changePassword(req: Request, res: Response) {
        const userId = (req as any).userId;
        const { current_password, new_password } = req.body;

        if (!current_password) {
            throw new Error('current_password가 필요합니다');
        }
        if (!new_password) {
            throw new Error('new_password가 필요합니다');
        }

        const result = await changePassword(userId, current_password, new_password);

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    static async verifyEmail(req: Request, res: Response) {
        const { token } = req.body;

        if (!token) {
            throw new Error('token이 필요합니다');
        }

        const result = await verifyEmail(token);

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    // OAuth Methods
    static async googleAuth(req: Request, res: Response) {
        const config = getConfig();
        const state = await generateGoogleOAuthState();
        const googleOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleOAuthUrl.searchParams.set('client_id', config.oauth.google.clientId);
        googleOAuthUrl.searchParams.set('redirect_uri', config.oauth.google.callbackUrl);
        googleOAuthUrl.searchParams.set('response_type', 'code');
        googleOAuthUrl.searchParams.set('scope', 'openid profile email');
        googleOAuthUrl.searchParams.set('state', state);
        res.redirect(googleOAuthUrl.toString());
    }

    static async googleCallback(req: Request, res: Response) {
        const { code, state } = req.query;
        if (!code || typeof code !== 'string') throw new Error('OAuth authorization code is required');
        if (!state || typeof state !== 'string') throw new Error('OAuth state parameter is required');

        const isValidState = await validateGoogleOAuthState(state);
        if (!isValidState) throw new Error('Invalid or expired OAuth state');

        const tokenResponse = await getGoogleAccessToken(code);
        const googleUserInfo = await getGoogleUserInfo(tokenResponse.access_token);
        const ipAddress = AuthController.getClientIp(req);
        const userAgent = req.get('user-agent') || 'unknown';

        const result = await googleLogin(tokenResponse.access_token, googleUserInfo, ipAddress, userAgent);

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    static async kakaoAuth(req: Request, res: Response) {
        const config = getConfig();
        const state = await generateKakaoOAuthState();
        const kakaoOAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize');
        kakaoOAuthUrl.searchParams.set('client_id', config.oauth.kakao.clientId);
        kakaoOAuthUrl.searchParams.set('redirect_uri', config.oauth.kakao.callbackUrl);
        kakaoOAuthUrl.searchParams.set('response_type', 'code');
        kakaoOAuthUrl.searchParams.set('state', state);
        res.redirect(kakaoOAuthUrl.toString());
    }

    static async kakaoCallback(req: Request, res: Response) {
        const { code, state } = req.query;
        if (!code || typeof code !== 'string') throw new Error('OAuth authorization code is required');
        if (!state || typeof state !== 'string') throw new Error('OAuth state parameter is required');

        const isValidState = await validateKakaoOAuthState(state);
        if (!isValidState) throw new Error('Invalid or expired OAuth state');

        const tokenResponse = await getKakaoAccessToken(code);
        const kakaoUserInfo = await getKakaoUserInfo(tokenResponse.access_token);
        const ipAddress = AuthController.getClientIp(req);
        const userAgent = req.get('user-agent') || 'unknown';

        const result = await kakaoLogin(tokenResponse.access_token, kakaoUserInfo, ipAddress, userAgent);

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }

    static async naverAuth(req: Request, res: Response) {
        const config = getConfig();
        const state = await generateNaverOAuthState();
        const naverOAuthUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
        naverOAuthUrl.searchParams.set('client_id', config.oauth.naver.clientId);
        naverOAuthUrl.searchParams.set('redirect_uri', config.oauth.naver.callbackUrl);
        naverOAuthUrl.searchParams.set('response_type', 'code');
        naverOAuthUrl.searchParams.set('state', state);
        res.redirect(naverOAuthUrl.toString());
    }

    static async naverCallback(req: Request, res: Response) {
        const { code, state } = req.query;
        if (!code || typeof code !== 'string') throw new Error('OAuth authorization code is required');
        if (!state || typeof state !== 'string') throw new Error('OAuth state parameter is required');

        const isValidState = await validateNaverOAuthState(state);
        if (!isValidState) throw new Error('Invalid or expired OAuth state');

        const tokenResponse = await getNaverAccessToken(code, state);
        const naverUserInfo = await getNaverUserInfo(tokenResponse.access_token);
        const ipAddress = AuthController.getClientIp(req);
        const userAgent = req.get('user-agent') || 'unknown';

        const result = await naverLogin(tokenResponse.access_token, naverUserInfo, ipAddress, userAgent);

        res.status(200).json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }
}
