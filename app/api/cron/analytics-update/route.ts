import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import Analytics from "@/models/Analytics";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await dbConnect();

        // Fetch real stats
        const [totalUsers, totalTeams, totalSubmissions, totalEvaluated] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            Team.countDocuments({}),
            Team.countDocuments({ teamStatus: { $in: ['submitted', 'under-review', 'shortlisted', 'accepted', 'rejected'] } }),
            Team.countDocuments({ teamStatus: { $in: ['shortlisted', 'accepted', 'rejected'] } }),
        ]);

        const registered = Math.max(0, totalTeams - (totalSubmissions + totalEvaluated));

        const stats = {
            totalUsers,
            totalTeams: registered + totalSubmissions + totalEvaluated,
            totalSubmissions,
            totalEvaluated,
            date: new Date(),
        };

        // Store in DB
        await Analytics.create(stats);

        return NextResponse.json({ success: true, data: stats });

    } catch (error: any) {
        console.error("Cron job error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
