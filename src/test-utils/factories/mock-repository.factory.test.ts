import { expect, vi } from "vitest";
import {
  createMockQueryBuilder,
  createMockRepository,
  createMockRepositoryWithDefaults,
} from "./mock-repository.factory";

/**
 * Sample entity shape used to exercise the repository mocks
 */
interface Widget {
  id: string;
  name: string;
}

const widget: Widget = { id: "widget-1", name: "acme widget" };

describe("createMockRepository", () => {
  it("should mock all standard CRUD methods", () => {
    const repo = createMockRepository<Widget>();

    expect(vi.isMockFunction(repo.findOne)).toBe(true);
    expect(vi.isMockFunction(repo.find)).toBe(true);
    expect(vi.isMockFunction(repo.save)).toBe(true);
    expect(vi.isMockFunction(repo.update)).toBe(true);
    expect(vi.isMockFunction(repo.delete)).toBe(true);
    expect(vi.isMockFunction(repo.count)).toBe(true);
  });

  it("should return a chainable query builder", () => {
    const repo = createMockRepository<Widget>();
    const qb = repo.createQueryBuilder();

    expect(qb.select("w").where("w.id = :id").orderBy("w.name")).toBe(qb);
  });

  it("should allow configuring resolved values", async () => {
    const repo = createMockRepository<Widget>();
    repo.findOne.mockResolvedValue(widget);

    await expect(repo.findOne({ where: { id: "widget-1" } })).resolves.toBe(
      widget
    );
  });
});

describe("createMockQueryBuilder", () => {
  it("should chain every builder method", () => {
    const qb = createMockQueryBuilder<Widget>();

    const chained = qb
      .leftJoinAndSelect("w.parts", "parts")
      .andWhere("parts.id IS NOT NULL")
      .skip(0)
      .take(10);

    expect(chained).toBe(qb);
  });

  it("should mock execution methods separately", async () => {
    const qb = createMockQueryBuilder<Widget>();
    qb.getMany.mockResolvedValue([widget]);
    qb.getCount.mockResolvedValue(1);

    await expect(qb.getMany()).resolves.toEqual([widget]);
    await expect(qb.getCount()).resolves.toBe(1);
  });
});

describe("createMockRepositoryWithDefaults", () => {
  it("should preset findOne, find, and save", async () => {
    const repo = createMockRepositoryWithDefaults<Widget>({
      findOne: widget,
      find: [widget],
      save: widget,
    });

    await expect(repo.findOne({})).resolves.toBe(widget);
    await expect(repo.find()).resolves.toEqual([widget]);
    await expect(repo.save(widget)).resolves.toBe(widget);
  });

  it("should preset findAndCount and count", async () => {
    const repo = createMockRepositoryWithDefaults<Widget>({
      findAndCount: [[widget], 1],
      count: 7,
    });

    await expect(repo.findAndCount()).resolves.toEqual([[widget], 1]);
    await expect(repo.count()).resolves.toBe(7);
    await expect(repo.countBy({})).resolves.toBe(7);
  });

  it("should preset a null findOne", async () => {
    const repo = createMockRepositoryWithDefaults<Widget>({ findOne: null });

    await expect(repo.findOne({})).resolves.toBeNull();
  });

  it("should leave unconfigured methods unset", () => {
    const repo = createMockRepositoryWithDefaults<Widget>({});

    expect(repo.findOne({})).toBeUndefined();
    expect(repo.findOne).toHaveBeenCalledTimes(1);
  });
});
