import type { TSESTree } from '@typescript-eslint/types';

import { AST_NODE_TYPES } from '@typescript-eslint/types';

import type { Scope } from '../scope';
import type { Referencer } from './Referencer';

import { ParameterDefinition, TypeDefinition } from '../definition';
import { ScopeType } from '../scope';
import { Visitor } from './Visitor';

export class TypeVisitor extends Visitor {
  readonly #referencer: Referencer;

  constructor(referencer: Referencer) {
    super(referencer);
    this.#referencer = referencer;
  }

  static visit(referencer: Referencer, node: TSESTree.Node): void {
    const typeReferencer = new TypeVisitor(referencer);
    typeReferencer.visit(node);
  }

  ///////////////////
  // Visit helpers //
  ///////////////////

  protected visitFunctionType(
    node:
      | TSESTree.TSCallSignatureDeclaration
      | TSESTree.TSConstructorType
      | TSESTree.TSConstructSignatureDeclaration
      | TSESTree.TSFunctionType
      | TSESTree.TSMethodSignature,
  ): void {
    // arguments and type parameters can only be referenced from within the function
    this.#referencer.scopeManager.nestFunctionTypeScope(node);
    this.visit(node.typeParameters);

    for (const param of node.params) {
      let didVisitAnnotation = false;
      this.visitPattern(param, (pattern, info) => {
        // a parameter name creates a value type variable which can be referenced later via typeof arg
        this.#referencer
          .currentScope()
          .defineIdentifier(
            pattern,
            new ParameterDefinition(pattern, node, info.rest),
          );

        if (pattern.typeAnnotation) {
          this.visit(pattern.typeAnnotation);
          didVisitAnnotation = true;
        }
      });

      // there are a few special cases where the type annotation is owned by the parameter, not the pattern
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!didVisitAnnotation && 'typeAnnotation' in param) {
        this.visit(param.typeAnnotation);
      }
    }
    this.visit(node.returnType);

    this.#referencer.close(node);
  }

  protected visitPropertyKey(
    node: TSESTree.TSMethodSignature | TSESTree.TSPropertySignature,
  ): void {
    if (!node.computed) {
      return;
    }
    // computed members are treated as value references, and TS expects they have a literal type
    this.#referencer.visit(node.key);
  }

  /////////////////////
  // Visit selectors //
  /////////////////////

  protected Identifier(node: TSESTree.Identifier): void {
    this.#referencer.currentScope().referenceType(node);
  }

  protected MemberExpression(node: TSESTree.MemberExpression): void {
    this.visit(node.object);
    // don't visit the property
  }

  protected TSCallSignatureDeclaration(
    node: TSESTree.TSCallSignatureDeclaration,
  ): void {
    this.visitFunctionType(node);
  }

  protected TSConditionalType(node: TSESTree.TSConditionalType): void {
    // conditional types can define inferred type parameters
    // which are only accessible from inside the conditional parameter
    this.#referencer.scopeManager.nestConditionalTypeScope(node);

    // type parameters inferred in the condition clause are not accessible within the false branch
    this.visitChildren(node, ['falseType']);

    this.#referencer.close(node);

    this.visit(node.falseType);
  }

  protected TSConstructorType(node: TSESTree.TSConstructorType): void {
    this.visitFunctionType(node);
  }

  protected TSConstructSignatureDeclaration(
    node: TSESTree.TSConstructSignatureDeclaration,
  ): void {
    this.visitFunctionType(node);
  }

  protected TSFunctionType(node: TSESTree.TSFunctionType): void {
    this.visitFunctionType(node);
  }

  protected TSImportType(node: TSESTree.TSImportType): void {
    // the TS parser allows any type to be the parameter, but it's a syntax error - so we can ignore it
    this.visit(node.typeArguments);
    // the qualifier is just part of a standard EntityName, so it should not be visited
  }

  protected TSIndexSignature(node: TSESTree.TSIndexSignature): void {
    for (const param of node.parameters) {
      if (param.type === AST_NODE_TYPES.Identifier) {
        this.visit(param.typeAnnotation);
      }
    }
    this.visit(node.typeAnnotation);
  }

  protected TSInferType(node: TSESTree.TSInferType): void {
    const typeParameter = node.typeParameter;
    let scope = this.#referencer.currentScope();

    /*
    An inferred type parameter is bound by the closest conditional type whose `extends` clause contains it.
    It may be nested inside child type scopes (function types, mapped types), or inside another conditional type
    (e.g. `A extends (B extends unknown ? infer R : never) ? R : never`), so the generic must be defined in
    the scope of that conditional type, not in the innermost scope.
    */
    for (
      let currentScope: Scope | null = scope;
      currentScope;
      currentScope = currentScope.upper
    ) {
      if (
        currentScope.type === ScopeType.conditionalType &&
        currentScope.block.extendsType.range[0] <= node.range[0] &&
        node.range[1] <= currentScope.block.extendsType.range[1]
      ) {
        scope = currentScope;
        break;
      }
    }

    scope.defineIdentifier(
      typeParameter.name,
      new TypeDefinition(typeParameter.name, typeParameter),
    );

    this.visit(typeParameter.constraint);
  }

  protected TSInterfaceDeclaration(
    node: TSESTree.TSInterfaceDeclaration,
  ): void {
    this.#referencer
      .currentScope()
      .defineIdentifier(node.id, new TypeDefinition(node.id, node));

    if (node.typeParameters) {
      // type parameters cannot be referenced from outside their current scope
      this.#referencer.scopeManager.nestTypeScope(node);
      this.visit(node.typeParameters);
    }

    node.extends.forEach(this.visit, this);
    this.visit(node.body);

    if (node.typeParameters) {
      this.#referencer.close(node);
    }
  }

  protected TSMappedType(node: TSESTree.TSMappedType): void {
    // mapped types key can only be referenced within their return value
    this.#referencer.scopeManager.nestMappedTypeScope(node);
    this.#referencer
      .currentScope()
      .defineIdentifier(node.key, new TypeDefinition(node.key, node));
    this.visit(node.constraint);
    this.visit(node.nameType);
    this.visit(node.typeAnnotation);
    this.#referencer.close(node);
  }

  protected TSMethodSignature(node: TSESTree.TSMethodSignature): void {
    this.visitPropertyKey(node);
    this.visitFunctionType(node);
  }

  protected TSNamedTupleMember(node: TSESTree.TSNamedTupleMember): void {
    this.visit(node.elementType);
    // we don't visit the label as the label only exists for the purposes of documentation
  }

  protected TSPropertySignature(node: TSESTree.TSPropertySignature): void {
    this.visitPropertyKey(node);
    this.visit(node.typeAnnotation);
  }

  protected TSQualifiedName(node: TSESTree.TSQualifiedName): void {
    if (node.left.type === AST_NODE_TYPES.Identifier) {
      // the left side of a qualified name is a namespace, which a type parameter can't be
      this.#referencer.currentScope().referenceValue(node.left);
    } else {
      this.visit(node.left);
    }
    // we don't visit the right as it a name on the thing, not a name to reference
  }

  protected TSTypeAliasDeclaration(
    node: TSESTree.TSTypeAliasDeclaration,
  ): void {
    this.#referencer
      .currentScope()
      .defineIdentifier(node.id, new TypeDefinition(node.id, node));

    if (node.typeParameters) {
      // type parameters cannot be referenced from outside their current scope
      this.#referencer.scopeManager.nestTypeScope(node);
      this.visit(node.typeParameters);
    }

    this.visit(node.typeAnnotation);

    if (node.typeParameters) {
      this.#referencer.close(node);
    }
  }

  protected TSTypeParameter(node: TSESTree.TSTypeParameter): void {
    this.#referencer
      .currentScope()
      .defineIdentifier(node.name, new TypeDefinition(node.name, node));

    this.visit(node.constraint);
    this.visit(node.default);
  }

  protected TSTypePredicate(node: TSESTree.TSTypePredicate): void {
    if (node.parameterName.type !== AST_NODE_TYPES.TSThisType) {
      this.#referencer.currentScope().referenceValue(node.parameterName);
    }
    this.visit(node.typeAnnotation);
  }

  // a type query `typeof foo` is a special case that references a _non-type_ variable,
  protected TSTypeAnnotation(node: TSESTree.TSTypeAnnotation): void {
    // check
    this.visitChildren(node);
  }

  protected TSTypeQuery(node: TSESTree.TSTypeQuery): void {
    let entityName:
      TSESTree.Identifier | TSESTree.ThisExpression | TSESTree.TSImportType;
    if (node.exprName.type === AST_NODE_TYPES.TSQualifiedName) {
      let iter = node.exprName;
      while (iter.left.type === AST_NODE_TYPES.TSQualifiedName) {
        iter = iter.left;
      }
      entityName = iter.left;
    } else {
      entityName = node.exprName;

      if (node.exprName.type === AST_NODE_TYPES.TSImportType) {
        this.visit(node.exprName);
      }
    }
    if (entityName.type === AST_NODE_TYPES.Identifier) {
      this.#referencer.currentScope().referenceValue(entityName);
    }

    this.visit(node.typeArguments);
  }
}
