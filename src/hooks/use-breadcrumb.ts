import { type RouteObject, useLocation } from "react-router-dom";
import { routesConfig } from "@/routers";

type RouteObj = RouteObject & {
  breadcrumb?: {title: string, link: string}[];
}

export function useBreadcrumbs() {
  const location = useLocation();
  let breadcrumbs: {title: string, link: string}[] = [];

  const pick = (routes: RouteObj[], parentPath: string = "") => {
    for (const route of routes) {
      const fullPath = route.path
        ? `${parentPath}/${route.path}`.replace(/\/+/g, "/")
        : parentPath;
      const match = location.pathname === fullPath;

      if (match && route.breadcrumb) {
        breadcrumbs = route.breadcrumb;
        return true;
      }

      if (route.children) {
        if (pick(route.children, fullPath)) {
          return true;
        }
      }
    }

    return false;
  }

  pick(routesConfig);
  return breadcrumbs;
}
