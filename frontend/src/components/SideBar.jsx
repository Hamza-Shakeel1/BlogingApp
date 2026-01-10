import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = ({ auth }) => {
  const user = auth?.user;

  return (
    <div ></div>
    // <div className="sidebar">
    //   <NavLink
    //     to="/user-profile"
    //     className={({ isActive }) =>
    //       isActive ? "sidebar-link active" : "sidebar-link"
    //     }
    //   >
    //     User Profile
    //   </NavLink>

    //   <NavLink
    //     to="/posts"
    //     className={({ isActive }) =>
    //       isActive ? "sidebar-link active" : "sidebar-link"
    //     }
    //   >
    //     All Posts
    //   </NavLink>

    //   <NavLink
    //     to="/my-posts"
    //     className={({ isActive }) =>
    //       isActive ? "sidebar-link active" : "sidebar-link"
    //     }
    //   >
    //     My Posts
    //   </NavLink>

    //   {user?.role === "admin" && (
    //     <NavLink
    //       to="/create-post"
    //       className={({ isActive }) =>
    //         isActive ? "sidebar-link active" : "sidebar-link"
    //       }
    //     >
    //       Admin Dashboard
    //     </NavLink>
    //   )}
    // </div>
  );
};

export default Sidebar;
