/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.createTable("pipeline_changes", (table) => {
    table.string('id');
    table.primary('id');
    table.integer('number');
    table.string('subject');
    table.enu('status', ['NEW', 'MERGED', 'ABANDONED']);
    table.string("projectName");
    table.string("ownerName");
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.dropTable("pipeline_changes");
};
