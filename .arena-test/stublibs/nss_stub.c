/* Minimal stubs for the NSS functions chromium imports (libnss3.so).
   Return values are chosen to be harmless for a headless shell that only
   talks to http://localhost — real cert verification is NOT supported. */

#include <stdint.h>
#include <stdlib.h>

typedef unsigned char PRBool;
typedef int32_t PRInt32;
typedef void *SECItem;
typedef void *CERTCertificate;
typedef void *CERTCertList;
typedef void *CERTCertTrust;
typedef void *PK11SlotInfo;
typedef void *SECMODModule;
typedef void *SECMODModuleList;
typedef void *PRArenaPool;
typedef void *PK11GenericObject;

/* ---- NSS init / version ---- */
PRInt32 NSS_NoDB_Init(void) { return 0; }           /* pretend success */
PRInt32 NSS_InitReadWrite(void) { return -1; }
PRBool  NSS_VersionCheck(const char *v) { (void)v; return 1; }
PRInt32 NSS_SetAlgorithmPolicy(uint32_t alg, uint32_t policy, uint32_t flags) { (void)alg; (void)policy; (void)flags; return 0; }

/* ---- CERT ---- */
CERTCertList *CERT_CreateSubjectCertList(CERTCertList *list, void *slot, void *id, void *time, PRBool validOnly) { (void)list; (void)slot; (void)id; (void)time; (void)validOnly; return (CERTCertList *)0; }
void CERT_DestroyCertList(CERTCertList *l) { (void)l; }
void CERT_DestroyCertificate(CERTCertificate *c) { (void)c; }
CERTCertificate *CERT_DupCertificate(CERTCertificate *c) { return c; }
CERTCertificate *CERT_FindCertByDERCert(void *slot, void *derCert, void *time) { (void)slot; (void)derCert; (void)time; return (CERTCertificate *)0; }
PRInt32 CERT_GetCertTrust(CERTCertificate *c, void *trust) { (void)c; (void)trust; return -1; }
void *CERT_GetDefaultCertDB(void) { return (void *)0; }
PRBool CERT_IsUserCert(CERTCertificate *c) { (void)c; return 0; }

/* ---- PK11 ---- */
void PK11_DestroyGenericObjects(PK11GenericObject *o) { (void)o; }
CERTCertificate *PK11_FindCertInSlot(PK11SlotInfo *slot, void *id, void *wincx) { (void)slot; (void)id; (void)wincx; return (CERTCertificate *)0; }
PK11GenericObject *PK11_FindGenericObjects(PK11SlotInfo *slot, void *type) { (void)slot; (void)type; return (PK11GenericObject *)0; }
void PK11_FreeSlot(PK11SlotInfo *slot) { (void)slot; }
PK11SlotInfo *PK11_GetInternalKeySlot(void) { return (PK11SlotInfo *)0; }
void *PK11_GetModule(PK11SlotInfo *slot) { (void)slot; return (void *)0; }
PK11GenericObject *PK11_GetNextGenericObject(PK11GenericObject *o) { (void)o; return (PK11GenericObject *)0; }
char *PK11_GetTokenName(PK11SlotInfo *slot) { (void)slot; return (char *)0; }
PRBool PK11_HasAttributeSet(PK11SlotInfo *slot, void *id, void *type, void *wincx) { (void)slot; (void)id; (void)type; (void)wincx; return 0; }
PRBool PK11_HasRootCerts(PK11SlotInfo *slot) { (void)slot; return 0; }
PRInt32 PK11_InitPin(PK11SlotInfo *slot, const char *pin, const char *newPin) { (void)slot; (void)pin; (void)newPin; return -1; }
PRBool PK11_IsPresent(PK11SlotInfo *slot) { (void)slot; return 0; }
CERTCertList *PK11_ListCerts(int type, void *wincx) { (void)type; (void)wincx; return (CERTCertList *)0; }
CERTCertList *PK11_ListCertsInSlot(PK11SlotInfo *slot) { (void)slot; return (CERTCertList *)0; }
PRBool PK11_NeedUserInit(PK11SlotInfo *slot) { (void)slot; return 0; }
PRInt32 PK11_ReadRawAttribute(PK11SlotInfo *slot, void *type, void *id, void *out) { (void)slot; (void)type; (void)id; (void)out; return -1; }
PK11SlotInfo *PK11_ReferenceSlot(PK11SlotInfo *slot) { return slot; }
void PK11_SetPasswordFunc(void *func) { (void)func; }

/* ---- SECITEM ---- */
SECItem *SECITEM_AllocItem(void *arena, SECItem *item, uint32_t len) { (void)arena; (void)item; (void)len; return (SECItem *)0; }
void SECITEM_FreeItem(SECItem *item, PRBool freeIt) { (void)item; (void)freeIt; }

/* ---- SECMOD ---- */
void SECMOD_DestroyModule(SECMODModule *m) { (void)m; }
SECMODModuleList *SECMOD_GetDefaultModuleList(void) { return (SECMODModuleList *)0; }
void *SECMOD_GetDefaultModuleListLock(void) { return (void *)0; }
void *SECMOD_GetReadLock(void *lock) { (void)lock; return (void *)0; }
SECMODModule *SECMOD_LoadUserModule(const char *path, void *dbopts, PRBool perm) { (void)path; (void)dbopts; (void)perm; return (SECMODModule *)0; }
void SECMOD_ReleaseReadLock(void *lock) { (void)lock; }
