import Link from "next/link";

import { siteConfig } from "~/config/site";

import { NavAction } from "./nav-action";

export const Navbar: React.FC = async () => {
  return (
    <header className="sticky top-0 z-40 h-16 border-b">
      <div className="container flex h-full items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold tracking-tighter drop-shadow md:text-xl lg:text-2xl"
        >
          {siteConfig.name}
        </Link>

        <NavAction />
      </div>
    </header>
  );
};
