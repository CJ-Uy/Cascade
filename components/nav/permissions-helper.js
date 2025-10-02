// Can be in the same file as your component or a separate utils file
import { buMenuItems } from "./menu-items"; // Adjust the import path

/**
 * Determines which menu items a user can see for a specific Business Unit.
 * @param {object} buPermission - The user's permission object for a single BU.
 * @param {string[]} systemRoles - The user's system-level roles.
 * @returns {Array} An array of menu item objects.
 */
const getVisibleMenuItems = (buPermission, systemRoles = []) => {
  // Define which menu items correspond to each role
  const memberItems = ["Create", "Running", "History"];
  const approverItems = ["To Approve", ...memberItems];
  const adminItems = [
    ...approverItems,
    "Employees",
    "Approval System",
    "Templates",
  ];

  // System Admins see all items for every BU
  if (systemRoles.length > 0) {
    return buMenuItems;
  }

  // Determine role for the specific BU
  const role = buPermission.role; // e.g., 'approver', 'BU Admin', 'Head', or null

  let visibleItemTitles;

  switch (role) {
    case "approver":
      visibleItemTitles = approverItems;
      break;

    case "BU Admin":
    case "Head":
      visibleItemTitles = adminItems;
      break;

    // Default case for 'MEMBER' permission level or null role
    default:
      visibleItemTitles = memberItems;
      break;
  }

  // Filter the full list of menu items to get only the ones the user should see
  return buMenuItems.filter((item) => visibleItemTitles.includes(item.title));
};
