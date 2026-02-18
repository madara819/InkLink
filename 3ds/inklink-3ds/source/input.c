#include "input.h"
#include <string.h>

void input_poll(InkPacket* out) {
    if (!out) return;
    memset(out, 0, sizeof(*out));

    hidScanInput();

    u32 kDown = hidKeysDown();
    u32 kHeld = hidKeysHeld();
    u32 kUp   = hidKeysUp();

    touchPosition t;
    hidTouchRead(&t);

    out->x = (int)t.px;
    out->y = (int)t.py;
    out->touching = (kHeld & KEY_TOUCH) ? 1 : 0;
    out->held = kHeld;
    out->down = kDown;
    out->up   = kUp;
}
