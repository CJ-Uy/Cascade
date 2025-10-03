import { LoginForm } from "@/components/landing/login-form";
import Image from "next/image";

export default function Login() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-white">
      <div className="grid h-full w-full lg:grid-cols-8">
        {/* Left side: Image */}
        <div className="relative col-span-5 hidden h-full w-full lg:block">
          <Image
            src="/svgs/AuthHero.svg"
            alt="Illustration of a waterfall and landscape"
            fill
            className="object-cover"
            quality={100}
            priority
          />
        </div>

        {/* Right side: Login Form */}
        <div className="flex w-full items-center justify-center p-6 lg:col-span-3 lg:p-10">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}