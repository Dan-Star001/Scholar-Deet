import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // 404 access
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col lg:flex-row-reverse items-center justify-center gap-12 lg:gap-24 w-full max-w-6xl animate-in fade-in slide-in-from-bottom-5 duration-700">
        {/* Illustration */}
        <div className="relative w-full max-w-md lg:max-w-xl">
          <img 
            src="/404-storyset.png" 
            alt="Page Not Found Illustration" 
            className="relative h-full w-full object-contain drop-shadow-sm hover:drop-shadow-xl transition-all duration-500"
          />
        </div>

        {/* Content */}
        <div className="text-center lg:text-left space-y-8 max-w-xl">
          <div className="space-y-1">
            <p className="text-lg font-bold text-primary tracking-widest uppercase">Oops!</p>
            <h1 className="text-7xl lg:text-7xl font-black text-foreground tracking-tighter leading-none select-none">
              Error <span className="text-primary/80">404</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed pt-4">
              We couldn't find the page you're looking for. It seems like the connection to this lesson has been lost in transit.
            </p>
          </div>

          <div className="pt-4">
            <a 
              href="/" 
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-10 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-1 active:scale-95"
            >
              Go Back
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
