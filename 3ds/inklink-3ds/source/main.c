#include <3ds.h>
#include <stdio.h>

#include "config.h"
#include "net.h"
#include "input.h"

int main(int argc, char **argv) {
    (void)argc; (void)argv;

    gfxInitDefault();
    consoleInit(GFX_TOP, NULL);

    printf("InkLink 3DS -> UDP\n");
    printf("Target: %s:%d\n", TARGET_IP, TARGET_PORT);
    printf("Sends: x y touching held down up\n");
    printf("START = exit\n\n");

    if (!net_init()) {
        printf("net_init failed.\nPress START\n");
        while (aptMainLoop()) {
            hidScanInput();
            if (hidKeysDown() & KEY_START) break;
            gspWaitForVBlank();
        }
        gfxExit();
        return 0;
    }

    while (aptMainLoop()) {
        InkPacket p;
        input_poll(&p);

        if (p.down & KEY_START) break;

        net_send(&p);

        svcSleepThread(SEND_INTERVAL_US * 1000);
        gspWaitForVBlank();
    }

    net_close();
    gfxExit();
    return 0;
}
