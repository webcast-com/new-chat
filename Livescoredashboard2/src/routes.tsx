import { createBrowserRouter } from "react-router";
import { MatchDetail } from "./components/MatchDetail";
import AppLayout from "./components/sports/AppLayout";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import AccessibilityStatement from "./pages/AccessibilityStatement";
import HelpCenter from "./pages/HelpCenter";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Press from "./pages/Press";
import Contact from "./pages/Contact";
import Advertise from "./pages/Advertise";
import Partners from "./pages/Partners";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
  },
  {
    path: "/match/:id",
    Component: MatchDetail,
  },
  {
    path: "/terms",
    Component: TermsOfService,
  },
  {
    path: "/privacy",
    Component: PrivacyPolicy,
  },
  {
    path: "/cookies",
    Component: CookiePolicy,
  },
  {
    path: "/accessibility",
    Component: AccessibilityStatement,
  },
  {
    path: "/help",
    Component: HelpCenter,
  },
  {
    path: "/about",
    Component: About,
  },
  {
    path: "/careers",
    Component: Careers,
  },
  {
    path: "/press",
    Component: Press,
  },
  {
    path: "/contact",
    Component: Contact,
  },
  {
    path: "/advertise",
    Component: Advertise,
  },
  {
    path: "/partners",
    Component: Partners,
  },
]);
