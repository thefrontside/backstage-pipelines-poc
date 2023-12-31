/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {

  // export interface ChangeInfo {
  //   number: number;
  //   subject: string;
  //   status: "NEW" | "MERGED" | "ABANDONED";
  //   branch: string;
  //   projectName: string;
  //   ownerName: string;
  // }

  await knex.schema.createTable("changes", (table) => {
    table.string('id');
    table.primary('id');
    table.integer('number');
    table.string('subject');
    table.enu('status', ['NEW', 'MERGED', 'ABANDONED']);
    table.string("projectName");
    table.string("ownerName");
    table.unique(['projectName', 'number']);
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.dropTable("changes");
};
