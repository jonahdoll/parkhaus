/**
 * Container mit Singletons zur Emulation von manueller DI
 *
 * @author [Jonah Doll](mailto:dojo1024@h-ka.de)
 */
export const container = {
    dbPopulateService: new DbPopulateService(),
};
