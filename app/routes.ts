import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [index("routes/home.tsx"), route("projects/:slug", "routes/project.tsx"), route("contact", "routes/contact.tsx"), route("*", "routes/not-found.tsx")] satisfies RouteConfig;
