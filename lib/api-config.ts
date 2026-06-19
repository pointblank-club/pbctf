/**
 * API endpoint map for the PBCTF app.
 *
 * All endpoints are relative to the Next.js app (no external backend).
 * Keep this in sync with the route handlers under `app/api/`.
 */

export const API_ENDPOINTS = {
  // ===== AUTHENTICATION =====
  register: '/api/registration',              // POST (FormData)
  login: '/api/user/login',                   // POST (JSON)

  // ===== USER ENDPOINTS =====
  userProfile: '/api/user/profile',                    // GET, PUT
  lookingForTeam: '/api/user/looking-for-team',        // GET, PUT
  userRsvp: '/api/user/rsvp',                          // PUT
  users: '/api/users',                                 // GET (by ID)
  userFlag: '/api/user/flag',                          // GET, POST

  // ===== TEAM ENDPOINTS =====
  createTeam: '/api/team/create',                      // POST
  lookingForMembers: '/api/team/looking-for-members',  // GET, PUT
  joinTeam: '/api/team/join',                          // PUT
  joinRequest: '/api/team/join-request',               // POST, GET
  respondToJoinRequest: (requestId: string) => `/api/team/join-request/${requestId}`,  // PUT
  cancelInvite: (requestId: string) => `/api/team/join-request/${requestId}`,           // DELETE
  leaveTeam: '/api/team/leave',                        // PUT
  removeMember: '/api/team/remove-member',             // PUT
  deleteTeam: '/api/team/delete',                      // DELETE
  getTeam: (teamCode: string) => `/api/team/${teamCode}`,  // GET

  // ===== ADMIN ENDPOINTS =====
  adminParticipants: '/api/admin/participants',        // GET
  adminTeams: '/api/admin/teams',                      // GET
  adminTeamDetails: (teamCode: string) => `/api/admin/teams/${teamCode}`,    // GET
  adminUpdateTeam: (teamCode: string) => `/api/admin/teams/${teamCode}`,     // PUT
  adminEvaluators: '/api/admin/evaluators',            // GET
  adminAssignEvaluators: '/api/admin/evaluators/assign',  // PUT
  adminExport: '/api/admin/export',                    // GET
  adminPromoteUser: '/api/admin/users/promote',        // PUT

  // ===== EVALUATOR ENDPOINTS =====
  evaluatorRegister: '/api/evaluator/register',        // POST
  evaluatorTeams: '/api/evaluator/teams',              // GET
  evaluatorEvaluate: '/api/evaluator/evaluate',        // POST
  evaluatorVote: '/api/evaluator/vote',                // PUT
};
