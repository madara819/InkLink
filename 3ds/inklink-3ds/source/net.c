#include "net.h"
#include "config.h"

#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>
#include <malloc.h>

static u32* soc_buffer = NULL;
static int sockfd = -1;
static struct sockaddr_in addr;

bool net_init(void) {
    soc_buffer = (u32*)memalign(0x1000, 0x100000); // 1MB
    if (!soc_buffer) return false;

    Result rc = socInit(soc_buffer, 0x100000);
    if (R_FAILED(rc)) return false;

    sockfd = socket(AF_INET, SOCK_DGRAM, 0);
    if (sockfd < 0) return false;

    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(TARGET_PORT);
    addr.sin_addr.s_addr = inet_addr(TARGET_IP);

    return true;
}

void net_close(void) {
    if (sockfd >= 0) {
        close(sockfd);
        sockfd = -1;
    }
    socExit();
    if (soc_buffer) {
        free(soc_buffer);
        soc_buffer = NULL;
    }
}

bool net_send(const InkPacket* p) {
    if (sockfd < 0 || !p) return false;

    char msg[128];
    snprintf(msg, sizeof(msg),
             "%d %d %d %08lX %08lX %08lX",
             p->x, p->y, p->touching,
             (unsigned long)p->held, (unsigned long)p->down, (unsigned long)p->up);

    int r = sendto(sockfd, msg, (int)strlen(msg), 0,
                   (struct sockaddr*)&addr, sizeof(addr));

    return (r >= 0);
}
