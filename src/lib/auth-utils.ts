// lib/auth-utils.ts
import { getSession } from "@/lib/auth-client"; // Assuming this is your client-side getSession

// Define a type for the session user if not already provided by auth-client
interface SessionUser {
  id: string;
  // Add other user properties if available and needed
}

// Define a type for the session object returned by getSession
interface AppSession {
  user: SessionUser | null;
  // Add other session properties if available
}

// Define a type for the expected API response for user data
interface UserApiResponse {
  siteRole?: string; // siteRole is optional as it might not exist
}

// Define the mapping of roles to their respective paths
const ROLE_PATHS: Record<string, string> = {
  initiator: "/initiator",
  "bu-head": "/bu-head",
  "akiva-approver": "/akiva-approver",
  approver: "/approver",
  // Add any other roles and their corresponding paths here
};

// Define the default path to redirect to if no specific role path is found or on error
const DEFAULT_LOGIN_PATH = "/norole";

/**
 * Fetches the user's site role and determines the appropriate redirect path.
 * If the role cannot be fetched, is invalid, or not found in ROLE_PATHS,
 * it defaults to the DEFAULT_LOGIN_PATH.
 *
 * @async
 * @function fetchRoleAndGetRedirectPath
 * @returns {Promise<string>} The path to redirect to.
 */
export async function fetchRoleAndGetRedirectPath(): Promise<string> {
  let userRole: string | null = null;

  try {
    const sessionResult = await getSession();
    const session = sessionResult?.data as AppSession | null; // Adjust based on actual getSession return

    if (!session?.user?.id) {
      console.warn(
        "fetchRoleAndGetRedirectPath: No active session or user ID found."
      );
      return DEFAULT_LOGIN_PATH; // Default path if no session
    }

    const response = await fetch("/api/user/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: session.user.id }),
    });

    if (!response.ok) {
      let errorDetails = "Failed to fetch user role.";
      try {
        const errorData = await response.json();
        errorDetails =
          errorData.message || errorData.error || JSON.stringify(errorData);
      } catch (e) {
        errorDetails = `Server responded with ${response.status}: ${response.statusText}`;
      }
      console.error(`fetchRoleAndGetRedirectPath: ${errorDetails}`);
      return DEFAULT_LOGIN_PATH; // Default path on fetch error
    }

    const data: UserApiResponse = await response.json();
    userRole = data?.siteRole || null;
  } catch (err) {
    if (err instanceof Error) {
      console.error(
        "fetchRoleAndGetRedirectPath: An unexpected error occurred while fetching role:",
        err.message
      );
    } else {
      console.error(
        "fetchRoleAndGetRedirectPath: An unexpected error occurred while fetching role:",
        err
      );
    }
    return DEFAULT_LOGIN_PATH; // Default path on any other error during fetch
  }

  // Now determine the path based on the fetched role
  if (userRole && ROLE_PATHS[userRole]) {
    return ROLE_PATHS[userRole];
  }

  console.warn(
    `fetchRoleAndGetRedirectPath: No specific path for role "${userRole || "not found/null"}". Defaulting to ${DEFAULT_LOGIN_PATH}.`
  );
  return DEFAULT_LOGIN_PATH;
}