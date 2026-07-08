import { expect } from "vitest";
import { BaseEntityBuilder } from "./entity-mock.builder";

/**
 * Sample entity shape used to exercise the base builder
 */
interface Member {
  id: string;
  email: string;
  organization: string;
}

/**
 * Concrete builder used to exercise BaseEntityBuilder behavior
 */
class MemberMockBuilder extends BaseEntityBuilder<Member> {
  constructor() {
    super({
      id: "member-1",
      email: "member@example.com",
      organization: "acme",
    });
  }

  /**
   * Set the member id
   * @param id - Identifier to assign
   * @returns Builder instance for chaining
   */
  withId(id: string): this {
    return this.withOverrides({ id });
  }
}

describe("BaseEntityBuilder", () => {
  it("should build the default entity", () => {
    const member = new MemberMockBuilder().build();

    expect(member).toEqual({
      id: "member-1",
      email: "member@example.com",
      organization: "acme",
    });
  });

  it("should apply overrides fluently", () => {
    const member = new MemberMockBuilder()
      .withOverrides({ email: "other@example.com" })
      .withId("member-2")
      .build();

    expect(member.id).toBe("member-2");
    expect(member.email).toBe("other@example.com");
    expect(member.organization).toBe("acme");
  });

  it("should return an independent copy on each build", () => {
    const builder = new MemberMockBuilder();
    const first = builder.build();
    const second = builder.build();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("should build many entities with per-index overrides", () => {
    const members = new MemberMockBuilder().buildMany(3, index => ({
      id: `member-${index}`,
    }));

    expect(members).toHaveLength(3);
    expect(members.map(member => member.id)).toEqual([
      "member-0",
      "member-1",
      "member-2",
    ]);
    expect(members[0].email).toBe("member@example.com");
  });

  it("should build many identical entities without an override factory", () => {
    const members = new MemberMockBuilder().buildMany(2);

    expect(members).toHaveLength(2);
    expect(members[0]).toEqual(members[1]);
    expect(members[0]).not.toBe(members[1]);
  });
});
