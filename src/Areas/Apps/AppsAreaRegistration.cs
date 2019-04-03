using System.Web.Mvc;

namespace Weavy.Areas.Apps {
    
    /// <summary>
    /// Class for registering the apps area.
    /// </summary>
    public class AppsAreaRegistration : AreaRegistration {

        /// <summary>
        /// 
        /// </summary>
        public override string AreaName => "Apps";

        /// <summary>
        /// 
        /// </summary>
        /// <param name="context"></param>
        public override void RegisterArea(AreaRegistrationContext context) {
        }
    }

    namespace Controllers {
        // dummy interface to avoid "The type or namespace name 'Controllers' does not exist in the namespace 'Weavy.Areas.Apps'" error.
        interface I {
        }
    }

    namespace Models {
        // dummy interface to avoid "The type or namespace name 'Models' does not exist in the namespace 'Weavy.Areas.Apps'" error.
        interface I {
        }
    }
}

