import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Početna" },
  { to: "/services", label: "Usluge" },
  { to: "/book", label: "Rezervacije" },
  { to: "/admin", label: "Admin" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="navbar-glass sticky top-0 z-50">
        <div style={{
          maxWidth: "1152px",
          margin: "0 auto",
          padding: "0 2rem",
          height: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>

          {/* Logo — veći, pomeren desno */}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            style={{
              textDecoration: "none",
              marginLeft: "1.5rem",  /* pomeren u desno */
            }}
          >
            <span className="salon-name" style={{
              fontSize: "1.85rem",
              fontWeight: "bold",
              color: "#c0185a",
              letterSpacing: "0.05em",
            }}>
              Trač
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex" style={{ alignItems: "center", gap: "0.25rem" }}>
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`nav-link ${pathname === l.to ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Hamburger */}
          <button
            className={`hamburger md:hidden ${open ? "open" : ""}`}
            onClick={() => setOpen((v) => !v)}
            aria-label="Meni"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu md:hidden ${open ? "open" : ""}`}>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`nav-link ${pathname === l.to ? "active" : ""}`}
            style={{ borderRadius: "14px" }}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </>
  );
}