/**
 * Base repository class with common CRUD operations
 */
export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Create a new document
   * @param {Object} data
   * @returns {Promise<Document>}
   */
  async create(data) {
    return this.model.create(data);
  }

  /**
   * Find by ID
   * @param {string} id
   * @returns {Promise<Document|null>}
   */
  async findById(id) {
    return this.model.findById(id).lean();
  }

  /**
   * Find one by filter
   * @param {Object} filter
   * @param {Object} projection
   * @returns {Promise<Document|null>}
   */
  async findOne(filter, projection = null) {
    return this.model.findOne(filter, projection).lean();
  }

  /**
   * Find by filter with options
   * @param {Object} filter
   * @param {Object} options
   * @returns {Promise<Document[]>}
   */
  async find(filter = {}, options = {}) {
    const {
      projection = null,
      sort = { createdAt: -1 },
      limit = 50,
      skip = 0,
      lean = true,
    } = options;

    let query = this.model.find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (lean) query = query.lean();

    return query.exec();
  }

  /**
   * Find by ID and update
   * @param {string} id
   * @param {Object} update
   * @param {Object} options
   * @returns {Promise<Document|null>}
   */
  async findByIdAndUpdate(id, update, options = {}) {
    return this.model.findByIdAndUpdate(id, update, { new: true, ...options }).lean();
  }

  /**
   * Find one and update
   * @param {Object} filter
   * @param {Object} update
   * @param {Object} options
   * @returns {Promise<Document|null>}
   */
  async findOneAndUpdate(filter, update, options = {}) {
    return this.model.findOneAndUpdate(filter, update, { new: true, ...options }).lean();
  }

  /**
   * Update many
   * @param {Object} filter
   * @param {Object} update
   * @returns {Promise<Object>}
   */
  async updateMany(filter, update) {
    return this.model.updateMany(filter, update);
  }

  /**
   * Delete by ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    const result = await this.model.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Delete one by filter
   * @param {Object} filter
   * @returns {Promise<boolean>}
   */
  async deleteOne(filter) {
    const result = await this.model.deleteOne(filter);
    return result.deletedCount > 0;
  }

  /**
   * Delete many by filter
   * @param {Object} filter
   * @returns {Promise<number>}
   */
  async deleteMany(filter) {
    const result = await this.model.deleteMany(filter);
    return result.deletedCount;
  }

  /**
   * Count documents
   * @param {Object} filter
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  /**
   * Check if exists
   * @param {Object} filter
   * @returns {Promise<boolean>}
   */
  async exists(filter) {
    return !!(await this.model.exists(filter));
  }

  /**
   * Aggregate
   * @param {Array} pipeline
   * @returns {Promise<Array>}
   */
  async aggregate(pipeline) {
    return this.model.aggregate(pipeline);
  }

  /**
   * Paginated find
   * @param {Object} filter
   * @param {Object} options
   * @returns {Promise<{data: Document[], total: number, page: number, pages: number}>}
   */
  async paginate(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      projection = null,
    } = options;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.find(filter, { projection, sort, limit, skip }),
      this.count(filter),
    ]);

    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }

  /**
   * Bulk write operations
   * @param {Array} operations
   * @returns {Promise<Object>}
   */
  async bulkWrite(operations) {
    return this.model.bulkWrite(operations);
  }

  /**
   * Get distinct values
   * @param {string} field
   * @param {Object} filter
   * @returns {Promise<Array>}
   */
  async distinct(field, filter = {}) {
    return this.model.distinct(field, filter);
  }
}

export default BaseRepository;