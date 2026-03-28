import type { Metadata } from "next";
import ThemeRegistry from "@/components/common/ThemeRegistry";
import { AuthProvider } from "@/hooks/useAuth";
import { SocketProvider } from "@/hooks/useSocket";
import { VoiceProvider } from "@/hooks/useVoice";
import { NotificationSoundProvider } from "@/hooks/useNotificationSound";
import GlobalVoiceRoom from "@/components/voice/GlobalVoiceRoom";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discord Alternative",
  description: "Lightweight self-hosted Discord alternative",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AuthProvider>
            <SocketProvider>
              <VoiceProvider>
                <NotificationSoundProvider>
                  <GlobalVoiceRoom>
                    {children}
                  </GlobalVoiceRoom>
                </NotificationSoundProvider>
              </VoiceProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
