import { DbPopulateService } from './config/dev/db-populate.mts';
import { ParkhausService } from './parkhaus/service/parkhaus-service.mts';

const parkhausService = new ParkhausService();

/**
 * Container mit Singletons zur Emulation von manueller DI
 *
 * @author [Jonah Doll](mailto:dojo1024@h-ka.de)
 */
export const container = {
    dbPopulateService: new DbPopulateService(),
    parkhausService,
};
