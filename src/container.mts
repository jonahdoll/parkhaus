import { DbPopulateService } from './config/dev/db-populate.mts';
import { KeycloakService } from './security/keycloak-service.mts';
import { ParkhausService } from './parkhaus/service/parkhaus-service.mts';
import { ParkhausWriteService } from './parkhaus/service/parkhaus-write-service.mts';

const parkhausService = new ParkhausService();
const parkhausWriteService = new ParkhausWriteService(parkhausService);

/**
 * Container mit Singletons zur Emulation von manueller DI
 *
 * @author [Jonah Doll](mailto:dojo1024@h-ka.de)
 */
export const container = {
    dbPopulateService: new DbPopulateService(),
    keycloakService: new KeycloakService(),
    parkhausService,
    parkhausWriteService,
};
