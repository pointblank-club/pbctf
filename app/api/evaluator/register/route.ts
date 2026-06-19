import { NextRequest, NextResponse } from "next/server";
import { createAuthErrorResponse } from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import Evaluator from "@/models/Evaluator";
import User from "@/models/User";
import { getAuth } from "@/lib/firebase-admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";

export const dynamic = 'force-dynamic';

function createSuccessResponse(message: string, data: any, status = 200) {
    return NextResponse.json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    }, { status });
}

function createErrorResponse(message: string, code: string, status: number) {
    return NextResponse.json({
        success: false,
        message,
        error: { code, message },
        timestamp: new Date().toISOString(),
    }, { status });
}

/**
 * POST /api/evaluator/register
 * Register a new evaluator
 * This endpoint should be called AFTER Firebase Auth registration on the client
 */
export async function POST(request: NextRequest) {
    try {
        const ip = getClientIp(request);
        if (!(await checkRateLimit(ip, 5, 60 * 1000))) {
            return createErrorResponse("Too many requests. Please try again later.", "RATE_LIMIT_EXCEEDED", 429);
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return createErrorResponse("Authentication required", "AUTH_REQUIRED", 401);
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(token);
        } catch (error) {
            return createErrorResponse("Invalid or expired token", "TOKEN_INVALID", 401);
        }

        const uid = decodedToken.uid;
        const email = decodedToken.email || "";
        const body = await request.json();
        const { name, evaluatorCode, recaptcha_token } = body;

        // reCAPTCHA v3 background score check. The Firebase user was created
        // client-side before this call, so clean it up if the check fails.
        const captcha = await verifyRecaptcha(recaptcha_token, "evaluator_register");
        if (!captcha.ok) {
            console.warn("[evaluator/register] reCAPTCHA rejected:", captcha.reason, captcha.score);
            try {
                await getAuth().deleteUser(uid);
            } catch (deleteError) {
                console.error(`Failed to delete user ${uid} after reCAPTCHA failure:`, deleteError);
            }
            return createErrorResponse("Security check failed. Please try again.", "RECAPTCHA_FAILED", 400);
        }

        if (!name) {
            return createErrorResponse("Name is required", "VALIDATION_ERROR", 400);
        }

        const expectedCode = process.env.EVALUATOR_CODE;
        if (!expectedCode) {
            console.error("EVALUATOR_CODE not set on server");
            return createErrorResponse("Server configuration error", "CONFIG_ERROR", 500);
        }

        if (evaluatorCode !== expectedCode) {
            // Delete the unauthorized user from Firebase Auth
            try {
                await getAuth().deleteUser(uid);
                console.log(`Deleted unauthorized user ${uid} due to invalid evaluator code`);
            } catch (deleteError) {
                console.error(`Failed to delete unauthorized user ${uid}:`, deleteError);
            }
            return createErrorResponse("Invalid evaluator code", "INVALID_CODE", 403);
        }

        await dbConnect();

        // Check if already exists
        const existingEvaluator = await Evaluator.findOne({ uid });
        if (existingEvaluator) {
            return createErrorResponse("Evaluator profile already exists", "DUPLICATE", 409);
        }

        // Check if user exists (User collection)
        const existingUser = await User.findOne({ uid });
        if (existingUser) {
            // Update role if exists
            existingUser.role = "evaluator";
            await existingUser.save();
        } else {
            // Create User if not exists (though AuthProvider might have done it?)
            await User.create({
                uid,
                email,
                name,
                role: "evaluator"
            });
        }

        // Create Evaluator Profile
        const newEvaluator = await Evaluator.create({
            uid,
            email,
            name,
            role: "evaluator",
            assignedTeams: [],
            stats: {
                evaluationsCompleted: 0,
                evaluationsPending: 0
            }
        });

        return createSuccessResponse("Evaluator registered successfully", {
            evaluator: newEvaluator
        });

    } catch (error: any) {
        console.error("Evaluator registration error:", error);
        return createErrorResponse("Failed to register evaluator", "SERVER_ERROR", 500);
    }
}
