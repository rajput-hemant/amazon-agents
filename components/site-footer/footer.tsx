import { Github, Twitter } from "lucide-react";

import { siteConfig } from "~/config/site";

import { Button } from "../ui/button";

export const Footer: React.FC = () => {
  return (
    <footer className="min-h-12 border-t">
      <div className="container flex h-full items-center justify-between">
        <div className=""></div>
        <p className="text-sm text-muted-foreground drop-shadow-sm">
          &copy; {new Date().getFullYear()} {siteConfig.name}
        </p>

        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            href={siteConfig.links.github}
            className="size-8"
          >
            <Github className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            href={siteConfig.links.discord}
            className="size-8"
          >
            <Twitter className="size-4" />
          </Button>
        </div>
      </div>
    </footer>
  );
};
