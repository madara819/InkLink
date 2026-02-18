#include <3ds.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>
#include <malloc.h>
#include <stdbool.h>

#define TARGET_IP   "192.168.1.78"
#define TARGET_PORT 4545

int main(int argc, char **argv) {
    (void)argc; (void)argv;

    gfxInitDefault();
    consoleInit(GFX_TOP, NULL);

    // SOC init
    u32 *soc_buffer = (u32*)memalign(0x1000, 0x100000); // 1MB
    if (!soc_buffer) {
        printf("memalign failed\nPress START\n");
        while (aptMainLoop()) {
            hidScanInput();
            if (hidKeysDown() & KEY_START) break;
            gspWaitForVBlank();
        }
        gfxExit();
        return 0;
    }

    Result rc = socInit(soc_buffer, 0x100000);
    if (R_FAILED(rc)) {
        printf("socInit failed: 0x%08lX\nPress START\n", rc);
        while (aptMainLoop()) {
            hidScanInput();
            if (hidKeysDown() & KEY_START) break;
            gspWaitForVBlank();
        }
        free(soc_buffer);
        gfxExit();
        return 0;
    }

    int sock = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0) {
        printf("socket failed\nPress START\n");
        while (aptMainLoop()) {
            hidScanInput();
            if (hidKeysDown() & KEY_START) break;
            gspWaitForVBlank();
        }
        socExit();
        free(soc_buffer);
        gfxExit();
        return 0;
    }

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(TARGET_PORT);
    addr.sin_addr.s_addr = inet_addr(TARGET_IP);

    bool modeOsu = false; // false = Illustrator, true = OSU!

    printf("InkLink 3DS -> UDP\n");
    printf("Target: %s:%d\n", TARGET_IP, TARGET_PORT);
    printf("Packet: x y touching held down up\n");
    printf("SELECT = toggle display\n");
    printf("START  = exit\n\n");
    printf("MODE: ILLUSTRATOR\n");

    while (aptMainLoop()) {
        hidScanInput();

        u32 kDown = hidKeysDown();
        u32 kHeld = hidKeysHeld();
        u32 kUp   = hidKeysUp();

        if (kDown & KEY_START) break;

        if (kDown & KEY_SELECT) {
            modeOsu = !modeOsu;
            consoleClear();
            printf("InkLink 3DS -> UDP\n");
            printf("Target: %s:%d\n", TARGET_IP, TARGET_PORT);
            printf("Packet: x y touching held down up\n");
            printf("SELECT = toggle display\n");
            printf("START  = exit\n\n");
            printf("MODE: %s\n", modeOsu ? "OSU!" : "ILLUSTRATOR");
        }

        touchPosition t;
        hidTouchRead(&t);
        int touching = (kHeld & KEY_TOUCH) ? 1 : 0;

        char msg[128];
        snprintf(msg, sizeof(msg),
                 "%d %d %d %08lX %08lX %08lX",
                 (int)t.px, (int)t.py, touching,
                 (unsigned long)kHeld, (unsigned long)kDown, (unsigned long)kUp);

        sendto(sock, msg, strlen(msg), 0, (struct sockaddr*)&addr, sizeof(addr));

        // ~120Hz
        svcSleepThread(8 * 1000 * 1000);
        gspWaitForVBlank();
    }

    close(sock);
    socExit();
    free(soc_buffer);
    gfxExit();
    return 0;
}
